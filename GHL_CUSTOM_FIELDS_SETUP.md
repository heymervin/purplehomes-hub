# GHL Custom Fields Setup Guide

This document provides a comprehensive guide for setting up all required custom fields in GoHighLevel (GHL) for the Purple Homes application to function correctly.

---

## Table of Contents

1. [Overview](#overview)
2. [How to Create Custom Fields in GHL](#how-to-create-custom-fields-in-ghl)
3. [Property Custom Fields (Required)](#property-custom-fields-required)
4. [Property Custom Fields (Optional)](#property-custom-fields-optional)
5. [Seller Acquisition Fields](#seller-acquisition-fields)
6. [Buyer Acquisition Fields](#buyer-acquisition-fields)
7. [Buyer Deal Fields](#buyer-deal-fields)
8. [Document Merge Fields](#document-merge-fields)
9. [Contact Custom Fields](#contact-custom-fields)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Purple Homes uses GHL custom fields to store and display property data, buyer preferences, and deal information. These fields must be created in your GHL account with the **exact field keys** specified below.

### Field Key Naming Convention

- Field keys are **case-insensitive** but should use **snake_case** (e.g., `property_beds`)
- The field key is what appears in the API, not the display name
- Always use the exact field key specified - typos will cause data mapping failures

---

## How to Create Custom Fields in GHL

1. Log in to your GHL account
2. Navigate to **Settings** → **Custom Fields**
3. Select the appropriate model (Opportunity or Contact)
4. Click **+ Add Field**
5. Enter the **Field Name** (display name)
6. Enter the **Field Key** (must match exactly as specified below)
7. Select the **Field Type** from the dropdown
8. For dropdown/options fields, add the specified options
9. Click **Save**

---

## Property Custom Fields (Required)

These fields are **required** for the Properties and Public Listings pages to function correctly.

| Field Key | Display Name | Type | Description |
|-----------|--------------|------|-------------|
| `property_address` | Property Address | TEXT | Full street address of the property |
| `property_beds` | Bedrooms | NUMBER | Number of bedrooms |
| `property_baths` | Bathrooms | NUMBER | Number of bathrooms (can include decimals like 2.5) |
| `property_sqft` | Square Footage | NUMBER | Total square footage of the property |
| `property_price` | Price | MONETARY | Listing/asking price in USD |
| `property_condition` | Property Condition | SINGLE_OPTIONS | Current condition of the property |
| `property_type` | Property Type | SINGLE_OPTIONS | Type of property |
| `property_zip` | Zip Code | TEXT | 5-digit zip code |

### Property Condition Options

Create a dropdown with these exact options:
- Excellent
- Great
- Good
- Fair
- Poor
- Terrible
- Needs some Repair

### Property Type Options

Create a dropdown with these exact options:
- Single Family
- Multi-Family
- Townhouse
- Condo
- Land
- Commercial

---

## Property Custom Fields (Optional)

These fields enhance property listings but are not required for basic functionality.

| Field Key | Display Name | Type | Description |
|-----------|--------------|------|-------------|
| `property_city` | City | TEXT | City name |
| `property_state` | State | TEXT | State abbreviation (e.g., TX, CA) |
| `property_images` | Property Images | FILE | Property photos (multiple allowed) |
| `property_arv` | After Repair Value (ARV) | MONETARY | Estimated value after repairs |
| `property_repair_cost` | Repair Cost | MONETARY | Estimated repair costs |
| `property_description` | Property Description | TEXT | Detailed property description |
| `social_status` | Social Media Status | SINGLE_OPTIONS | Social media posting status |

### Social Status Options

- SM-Pending
- SM-Posted
- SM-Scheduled
- SM-Skipped

---

## Seller Acquisition Fields

Used on the Seller Acquisitions page for tracking property acquisition from sellers.

| Field Key | Display Name | Type | Required | Description |
|-----------|--------------|------|----------|-------------|
| `address` | Property Address | TEXT | Yes | Address of the property being acquired |
| `email` | Seller Email | TEXT | No | Email address of the seller |
| `phone` | Seller Phone | TEXT | No | Phone number of the seller |
| `property_type` | Property Type | SINGLE_OPTIONS | No | Type of property |
| `asking_price` | Asking Price | MONETARY | No | Seller asking price |
| `offer_price` | Offer Price | MONETARY | No | Your offer price |

---

## Buyer Acquisition Fields

Used on the Buyer Acquisitions page for tracking external buyer offers from the public listings page.

| Field Key | Display Name | Type | Required | Description |
|-----------|--------------|------|----------|-------------|
| `property_address` | Property Address | TEXT | Yes | Address of property buyer is interested in |
| `offer_amount` | Offer Amount | MONETARY | No | Buyer offer amount |
| `phone` | Buyer Phone | TEXT | No | Buyer phone number |
| `email` | Buyer Email | TEXT | No | Buyer email address |
| `message` | Message | TEXT | No | Message from buyer |

---

## Buyer Deal Fields

Used on the Buyers page for managing qualified internal buyers and their preferences.

| Field Key | Display Name | Type | Description |
|-----------|--------------|------|-------------|
| `min_beds` | Minimum Beds | NUMBER | Minimum bedrooms buyer wants |
| `max_beds` | Maximum Beds | NUMBER | Maximum bedrooms buyer wants |
| `min_baths` | Minimum Baths | NUMBER | Minimum bathrooms buyer wants |
| `max_baths` | Maximum Baths | NUMBER | Maximum bathrooms buyer wants |
| `min_price` | Minimum Price | MONETARY | Minimum budget |
| `max_price` | Maximum Price | MONETARY | Maximum budget |
| `preferred_zip_codes` | Preferred Zip Codes | TEXT | Comma-separated list of preferred zip codes |
| `deal_type` | Deal Type | SINGLE_OPTIONS | Type of deal buyer is looking for |

### Deal Type Options

- Cash
- Financing
- Owner Finance
- Subject To

---

## Document Merge Fields

Used for populating document templates with property and contact data.

| Field Key | Display Name | Type | Model | Description |
|-----------|--------------|------|-------|-------------|
| `property_address` | Property Address | TEXT | Opportunity | Property address for documents |
| `buyer_name` | Buyer Name | TEXT | Contact | Name of the buyer |
| `seller_name` | Seller Name | TEXT | Contact | Name of the seller |
| `purchase_price` | Purchase Price | MONETARY | Opportunity | Final purchase price |
| `closing_date` | Closing Date | DATE | Opportunity | Expected closing date |
| `earnest_money` | Earnest Money | MONETARY | Opportunity | Earnest money deposit amount |

---

## Contact Custom Fields

Used on the Contacts page for managing all relationship types.

| Field Key | Display Name | Type | Description |
|-----------|--------------|------|-------------|
| `contact_type` | Contact Type | SINGLE_OPTIONS | Type of contact |
| `preferred_zip_codes` | Preferred Zip Codes | TEXT | Comma-separated list of preferred zip codes |
| `deals_closed` | Deals Closed | NUMBER | Number of deals closed with this contact |
| `transactions_count` | Transactions Count | NUMBER | Total number of transactions |

### Contact Type Options

- Seller
- Buyer
- Agent
- Wholesaler
- Investor

---

## Troubleshooting

### Field Not Appearing in Application

1. **Check the field key**: Ensure the field key in GHL matches exactly (case doesn't matter but spelling does)
2. **Check the model**: Make sure the field is created under the correct model (Opportunity vs Contact)
3. **Refresh the data**: Use the refresh button in the application to fetch latest field data
4. **Check API connection**: Verify your GHL API key and location ID are configured correctly

### Data Not Displaying Correctly

1. **Check the field type**: Ensure the field type matches (e.g., use NUMBER for beds/baths, not TEXT)
2. **Check option values**: For dropdown fields, option values must match exactly as specified
3. **Check for special characters**: Avoid special characters in field keys

### Validation Shows Missing Fields

1. Navigate to **Settings** → **Sync & Connection** tab
2. Review the Custom Fields Validation section
3. Click the copy button next to missing field keys
4. Create the missing fields in GHL with the copied field key
5. Click refresh to re-validate

---

## Pipeline Configuration

Ensure you have the following pipelines configured in GHL:

| Pipeline | Pipeline ID | Usage |
|----------|-------------|-------|
| Seller Acquisitions | `zL3H2M1BdEKlVDa2YWao` | Property sourcing from sellers |
| Buyer Dispositions | `cThFQOW6nkVKVxbBrDAV` | External buyer offers from public listings |
| Deal Acquisitions | `2NeLTlKaeMyWOnLXdTCS` | Internal qualified buyer management |

---

## Need Help?

If you continue to experience issues with custom field mapping:

1. Verify your GHL API credentials in the Settings page
2. Check the console logs for specific error messages
3. Ensure your GHL account has the necessary API permissions
4. Contact support with the specific field key and error message

---

*Last updated: December 2024*
