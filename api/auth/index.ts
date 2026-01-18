/**
 * Authentication API Handler
 *
 * Handles user authentication with Airtable Users table:
 * - signup: Register new users with hashed passwords
 * - login: Authenticate users and return user data
 *
 * Route: /api/auth?action=<action>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const SALT_ROUNDS = 10;

/**
 * Fetch with automatic retry on rate limit errors (429)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Auth] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, options);

      if (response.status === 429 && attempt < maxRetries) {
        console.warn(`[Auth] Rate limited (429) on attempt ${attempt + 1}/${maxRetries + 1}, will retry...`);
        lastError = new Error(`Rate limited: ${response.statusText}`);
        continue;
      }

      return response;
    } catch (error: any) {
      console.error(`[Auth] Fetch error on attempt ${attempt + 1}:`, error.message);
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Auth API] Request:', {
    method: req.method,
    action: req.query.action,
    timestamp: new Date().toISOString(),
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('[Auth API] Missing credentials!');
    return res.status(500).json({
      error: 'Airtable credentials not configured',
    });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const { action } = req.query;

  try {
    switch (action) {
      case 'signup':
        return handleSignup(req, res, headers);

      case 'login':
        return handleLogin(req, res, headers);

      case 'hash-password':
        // Utility endpoint to hash an existing plain text password
        return handleHashPassword(req, res);

      case 'list-users':
        // List all users (admin only)
        return handleListUsers(req, res, headers);

      case 'create-user':
        // Create a new user (admin only)
        return handleCreateUser(req, res, headers);

      case 'update-user':
        // Update user details (admin only)
        return handleUpdateUser(req, res, headers);

      case 'delete-user':
        // Delete/deactivate user (admin only)
        return handleDeleteUser(req, res, headers);

      case 'get-agents':
        // Get admin users with agent profiles (for Social Hub dropdown)
        return handleGetAgents(req, res, headers);

      case 'update-profile':
        // Update own agent profile (admin users only)
        return handleUpdateProfile(req, res, headers);

      default:
        return res.status(400).json({ error: 'Unknown action', action });
    }
  } catch (error: any) {
    console.error('[Auth API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

async function handleSignup(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['email', 'password', 'name'],
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  console.log(`[Auth] Signup attempt for: ${email}`);

  try {
    // Check if user already exists
    const checkFormula = encodeURIComponent(`{Email} = "${email}"`);
    const checkResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users?filterByFormula=${checkFormula}`,
      { headers }
    );

    if (!checkResponse.ok) {
      throw new Error(`Failed to check existing user: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();

    if (checkData.records && checkData.records.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the user in Airtable
    const createResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fields: {
            Email: email,
            Password: hashedPassword,
            Name: name,
            Role: role || 'User',
          },
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Auth] Create user error:', errorText);
      throw new Error(`Failed to create user: ${createResponse.status}`);
    }

    const userData = await createResponse.json();

    console.log(`[Auth] User created successfully: ${email}`);

    // Return user data (without password)
    return res.status(201).json({
      success: true,
      user: {
        id: userData.id,
        email: userData.fields.Email,
        name: userData.fields.Name,
        role: userData.fields.Role,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Signup error:', error);
    throw error;
  }
}

async function handleLogin(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['email', 'password'],
    });
  }

  console.log(`[Auth] Login attempt for: ${email}`);

  try {
    // Find user by email
    const formula = encodeURIComponent(`{Email} = "${email}"`);
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users?filterByFormula=${formula}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      console.log(`[Auth] User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = data.records[0];
    const storedPassword = user.fields.Password;

    if (!storedPassword) {
      console.log(`[Auth] No password set for user: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare passwords
    // Check if password is hashed (bcrypt hashes start with $2)
    let isValidPassword = false;

    if (storedPassword.startsWith('$2')) {
      // Password is hashed, use bcrypt compare
      isValidPassword = await bcrypt.compare(password, storedPassword);
    } else {
      // Password is plain text (legacy) - compare directly
      // Note: This is for backward compatibility during migration
      isValidPassword = password === storedPassword;

      if (isValidPassword) {
        // Upgrade to hashed password
        console.log(`[Auth] Upgrading plain text password to hashed for: ${email}`);
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await fetchWithRetry(
          `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users/${user.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              fields: { Password: hashedPassword },
            }),
          }
        );
      }
    }

    if (!isValidPassword) {
      console.log(`[Auth] Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[Auth] Login successful: ${email}`);

    // Check if user is active
    if (user.fields.IsActive === false || user.fields.IsActive === 'false') {
      console.log(`[Auth] User is deactivated: ${email}`);
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Return user data (without password) including permissions
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.fields.Email,
        name: user.fields.Name,
        role: user.fields.Role,
        isAdmin: user.fields.IsAdmin === true || user.fields.IsAdmin === 'true',
        permissions: parsePermissions(user.fields.Permissions),
      },
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    throw error;
  }
}

async function handleHashPassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  return res.status(200).json({
    original: password,
    hashed: hashedPassword,
    message: 'Use this hashed password in your Airtable Users table',
  });
}

// ==================== USER MANAGEMENT ====================

// Available permissions for users
const AVAILABLE_PERMISSIONS = [
  'dashboard',
  'properties',
  'contacts',
  'buyers',
  'property-pipeline',
  'buyer-dispositions',
  'deal-pipeline',
  'social-hub',
  'documents',
  'public-listings',
  'activity-logs',
  'settings',
  'manage-users',
] as const;

/**
 * List all users (admin only)
 */
async function handleListUsers(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[Auth] Listing all users');

  try {
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users?sort%5B0%5D%5Bfield%5D=Name&sort%5B0%5D%5Bdirection%5D=asc`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = await response.json();
    const users = (data.records || []).map((record: any) => ({
      id: record.id,
      email: record.fields.Email,
      name: record.fields.Name,
      isAdmin: record.fields.IsAdmin === true || record.fields.IsAdmin === 'true',
      isActive: record.fields.IsActive !== false && record.fields.IsActive !== 'false',
      permissions: parsePermissions(record.fields.Permissions),
      phone: record.fields.Phone || null,
      agentEmail: record.fields.AgentEmail || null,
      headshot: record.fields.Headshot || null,
      createdAt: record.fields.CreatedAt || record.createdTime,
    }));

    return res.status(200).json({ success: true, users });
  } catch (error: any) {
    console.error('[Auth] List users error:', error);
    throw error;
  }
}

/**
 * Create a new user (admin only)
 */
async function handleCreateUser(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, isAdmin, permissions, phone, agentEmail, headshot } = req.body;

  if (!email || !name) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['email', 'name'],
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  console.log(`[Auth] Creating user: ${email}`);

  try {
    // Check if user already exists
    const checkFormula = encodeURIComponent(`{Email} = "${email}"`);
    const checkResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users?filterByFormula=${checkFormula}`,
      { headers }
    );

    if (!checkResponse.ok) {
      throw new Error(`Failed to check existing user: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();

    if (checkData.records && checkData.records.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Generate a temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    // Prepare permissions string
    const permissionsString = Array.isArray(permissions) ? permissions.join(',') : '';

    // Create the user
    const createResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fields: {
            Email: email,
            Password: hashedPassword,
            Name: name,
            IsAdmin: isAdmin === true,
            IsActive: true,
            Permissions: permissionsString,
            Phone: phone || '',
            AgentEmail: agentEmail || '',
            Headshot: headshot || '',
            CreatedAt: new Date().toISOString(),
          },
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Auth] Create user error:', errorText);
      throw new Error(`Failed to create user: ${createResponse.status}`);
    }

    const userData = await createResponse.json();

    console.log(`[Auth] User created successfully: ${email}`);

    return res.status(201).json({
      success: true,
      user: {
        id: userData.id,
        email: userData.fields.Email,
        name: userData.fields.Name,
        isAdmin: userData.fields.IsAdmin === true,
        isActive: true,
        permissions: parsePermissions(userData.fields.Permissions),
      },
      tempPassword, // Return temp password so admin can share it
    });
  } catch (error: any) {
    console.error('[Auth] Create user error:', error);
    throw error;
  }
}

/**
 * Update user details (admin only)
 */
async function handleUpdateUser(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { name, isAdmin, isActive, permissions, phone, agentEmail, headshot, resetPassword } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  console.log(`[Auth] Updating user: ${id}`);

  try {
    const updateFields: Record<string, any> = {};

    if (name !== undefined) updateFields.Name = name;
    if (isAdmin !== undefined) updateFields.IsAdmin = isAdmin === true;
    if (isActive !== undefined) updateFields.IsActive = isActive === true;
    if (permissions !== undefined) {
      updateFields.Permissions = Array.isArray(permissions) ? permissions.join(',') : '';
    }
    if (phone !== undefined) updateFields.Phone = phone;
    if (agentEmail !== undefined) updateFields.AgentEmail = agentEmail;
    if (headshot !== undefined) updateFields.Headshot = headshot;

    let newTempPassword: string | undefined;

    // Reset password if requested
    if (resetPassword) {
      newTempPassword = generateTempPassword();
      updateFields.Password = await bcrypt.hash(newTempPassword, SALT_ROUNDS);
    }

    const updateResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users/${id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: updateFields }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[Auth] Update user error:', errorText);
      throw new Error(`Failed to update user: ${updateResponse.status}`);
    }

    const userData = await updateResponse.json();

    console.log(`[Auth] User updated successfully: ${id}`);

    return res.status(200).json({
      success: true,
      user: {
        id: userData.id,
        email: userData.fields.Email,
        name: userData.fields.Name,
        isAdmin: userData.fields.IsAdmin === true,
        isActive: userData.fields.IsActive !== false,
        permissions: parsePermissions(userData.fields.Permissions),
        phone: userData.fields.Phone || null,
        agentEmail: userData.fields.AgentEmail || null,
        headshot: userData.fields.Headshot || null,
      },
      ...(newTempPassword && { tempPassword: newTempPassword }),
    });
  } catch (error: any) {
    console.error('[Auth] Update user error:', error);
    throw error;
  }
}

/**
 * Delete/deactivate user (admin only)
 */
async function handleDeleteUser(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  console.log(`[Auth] Deactivating user: ${id}`);

  try {
    // Soft delete - just mark as inactive
    const updateResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users/${id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: { IsActive: false },
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to deactivate user: ${updateResponse.status}`);
    }

    console.log(`[Auth] User deactivated: ${id}`);

    return res.status(200).json({ success: true, message: 'User deactivated' });
  } catch (error: any) {
    console.error('[Auth] Delete user error:', error);
    throw error;
  }
}

/**
 * Get admin users with agent profiles (for Social Hub dropdown)
 */
async function handleGetAgents(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[Auth] Fetching agents');

  try {
    // Get only admin users who are active
    const formula = encodeURIComponent(`AND({IsAdmin} = TRUE(), {IsActive} = TRUE())`);
    const response = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users?filterByFormula=${formula}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status}`);
    }

    const data = await response.json();
    const agents = (data.records || [])
      .filter((record: any) => {
        // Only include agents with at least name and some profile info
        return record.fields.Name;
      })
      .map((record: any) => ({
        id: record.id,
        name: record.fields.Name,
        phone: record.fields.Phone || '',
        email: record.fields.AgentEmail || record.fields.Email || '',
        headshot: record.fields.Headshot || '',
        title: 'Agent',
      }));

    return res.status(200).json({ success: true, agents });
  } catch (error: any) {
    console.error('[Auth] Get agents error:', error);
    throw error;
  }
}

/**
 * Update own agent profile (admin users only)
 */
async function handleUpdateProfile(req: VercelRequest, res: VercelResponse, headers: any) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, phone, agentEmail, headshot } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  console.log(`[Auth] Updating agent profile: ${userId}`);

  try {
    const updateFields: Record<string, any> = {};

    if (phone !== undefined) updateFields.Phone = phone;
    if (agentEmail !== undefined) updateFields.AgentEmail = agentEmail;
    if (headshot !== undefined) updateFields.Headshot = headshot;

    const updateResponse = await fetchWithRetry(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Users/${userId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: updateFields }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update profile: ${updateResponse.status}`);
    }

    const userData = await updateResponse.json();

    console.log(`[Auth] Profile updated: ${userId}`);

    return res.status(200).json({
      success: true,
      profile: {
        phone: userData.fields.Phone || null,
        agentEmail: userData.fields.AgentEmail || null,
        headshot: userData.fields.Headshot || null,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Update profile error:', error);
    throw error;
  }
}

// ==================== HELPERS ====================

/**
 * Generate a random temporary password
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Parse permissions from comma-separated string to array
 */
function parsePermissions(permissions: string | undefined): string[] {
  if (!permissions) return [];
  return permissions.split(',').map(p => p.trim()).filter(Boolean);
}
