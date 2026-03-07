# HighLevel API - Contact Creation with Custom Fields

## Endpoint

```
POST https://services.leadconnectorhq.com/contacts
```

**Required Scope:** `contacts.write`

## Headers

```python
headers = {
    "Authorization": "Bearer <YOUR_API_KEY>",
    "Version": "2021-07-28",
    "Content-Type": "application/json"
}
```

## Request Payload

```json
{
  "locationId": "<DESTINATION_LOCATION_ID>",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+15551234567",
  "address1": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "postalCode": "78701",
  "country": "US",
  "website": "https://example.com",
  "timezone": "America/Chicago",
  "companyName": "Acme Corp",
  "source": "my-custom-form",
  "dateOfBirth": "1990-01-15",
  "tags": ["new-lead", "website-form"],
  "customFields": [
    { "id": "FIELD_ID_1", "value": "field value here" },
    { "id": "FIELD_ID_2", "value": "another value" }
  ]
}
```

### Standard Fields

| Field | Type | Notes |
|-------|------|-------|
| `locationId` | string | **Required.** Destination subaccount location ID |
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `email` | string | Email address (used for duplicate detection) |
| `phone` | string | Phone number (used for duplicate detection) |
| `address1` | string | Street address |
| `city` | string | City |
| `state` | string | State |
| `postalCode` | string | Zip/postal code |
| `country` | string | Country code |
| `website` | string | Website URL |
| `timezone` | string | IANA timezone (e.g. `America/Chicago`) |
| `companyName` | string | Company name |
| `source` | string | Lead source identifier |
| `dateOfBirth` | string | Date of birth |
| `tags` | string[] | Array of tag strings |
| `customFields` | array | Array of `{ "id": "<field_id>", "value": "<value>" }` objects |

### Custom Fields Format

Each custom field is an object with `id` and `value`:

```json
{
  "customFields": [
    { "id": "TtZSLvE4ammbQoKlYvKh", "value": "true" },
    { "id": "FASiZ77Jfjar3y8e2Gwh", "value": "Some text answer" }
  ]
}
```

- **TEXT fields:** Pass a string value
- **RADIO / SINGLE_OPTIONS:** Pass the option string (must match an existing option)
- **CHECKBOX / MULTIPLE_OPTIONS:** Pass an array of selected option strings
- **NUMBER:** Pass a number or numeric string
- **DATE:** Pass an ISO date string

### Getting Custom Field IDs

Fetch your subaccount's custom field definitions:

```
GET https://services.leadconnectorhq.com/locations/<locationId>/customFields
```

**Required Scope:** `locations/customFields.readonly`

Response returns all fields with their `id`, `name`, `dataType`, and `picklistOptions`.

## Response

### Success (200/201)

```json
{
  "contact": {
    "id": "NEW_CONTACT_ID",
    "locationId": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+15551234567",
    "tags": ["new-lead", "website-form"],
    "customFields": [...],
    "dateAdded": "2026-02-27T12:00:00.000Z"
  }
}
```

### Duplicate (422)

If a contact with the same email or phone already exists, the API returns a `422` with duplicate info. The response body will contain `"duplicate"` in the error message.

## Python Implementation

```python
import requests
import time

API_KEY = "<YOUR_SUBACCOUNT_API_KEY>"
LOCATION_ID = "<YOUR_LOCATION_ID>"
BASE_URL = "https://services.leadconnectorhq.com"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Version": "2021-07-28",
    "Content-Type": "application/json"
}


def create_contact(contact_data):
    """
    Create a contact in HighLevel.

    Args:
        contact_data: dict with contact fields + customFields array

    Returns:
        dict with 'success' bool and 'data' or 'error'
    """
    # Ensure locationId is set
    contact_data["locationId"] = LOCATION_ID

    response = requests.post(
        f"{BASE_URL}/contacts",
        headers=headers,
        json=contact_data,
        timeout=30
    )

    if response.status_code in [200, 201]:
        return {"success": True, "data": response.json()}

    # Handle rate limiting (429)
    if response.status_code == 429:
        time.sleep(2)
        response = requests.post(
            f"{BASE_URL}/contacts",
            headers=headers,
            json=contact_data,
            timeout=30
        )
        if response.status_code in [200, 201]:
            return {"success": True, "data": response.json()}

    return {
        "success": False,
        "error": response.text,
        "status": response.status_code
    }


# --- Example usage from your custom form ---

form_data = {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "+15559876543",
    "source": "my-custom-form",
    "tags": ["booking-lead"],
    "customFields": [
        {"id": "TtZSLvE4ammbQoKlYvKh", "value": "true"},  # is_fresh
        # Add more custom fields as needed using their destination field IDs
    ]
}

result = create_contact(form_data)

if result["success"]:
    new_contact_id = result["data"]["contact"]["id"]
    print(f"Contact created: {new_contact_id}")
else:
    print(f"Failed: {result['error']}")
```

## Rate Limiting

- HighLevel returns `429 Too Many Requests` when rate limited
- Wait **2 seconds** then retry
- For bulk operations, add a **0.5s delay** between requests
- Concurrent imports tested successfully with **5-10 workers**

## Duplicate Detection

HighLevel automatically checks for duplicates by **email** and **phone**. If a match is found, the API returns a `422` error. Handle this in your code:

```python
if "duplicate" in result.get("error", "").lower():
    print("Contact already exists - skipping")
```

## Custom Fields Mapping Reference

Your project has **451 custom fields** mapped in `custom_fields_mapping.json`. The mapping format is:

```json
{
  "SOURCE_FIELD_ID": "DESTINATION_FIELD_ID"
}
```

To get the human-readable field names, reference `custom_fields_source.json` which contains each field's `id`, `name`, `dataType`, and `picklistOptions`.
