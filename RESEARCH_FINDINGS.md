# Facebook Page Agent - Research Findings

## Facebook Graph API Capabilities for Pages

### Key Findings

#### 1. Pages API Overview
- **Authentication**: Uses Page Access Tokens (unique per Page, app User, and app)
- **Access Flow**:
  1. Get User Access Token via Facebook Login for Business
  2. Query `/me/accounts` to get Page ID and Page Access Token
  3. Use Page ID and token for subsequent API calls
- **Rate Limiting**: All Pages API requests are subject to rate limiting

#### 2. Permissions & Tasks
**Required Permissions for Core Features**:
- `MESSAGING`: Send messages as the Page
- `CREATE_CONTENT`: Publish content as the Page
- `MODERATE`: Respond to comments (for interaction management)
- `ANALYZE`: View Page insights

**All permissions require App Review before live deployment**

#### 3. Messenger Platform
- Supports real-time conversations with customers
- Send API enables message delivery
- Webhook events for incoming messages
- Support for structured messages (templates, buttons, quick replies)

#### 4. Important Limitations
- **Groups API Deprecation**: The Groups API was deprecated on April 22, 2024
  - `publish_to_groups` permission no longer available
  - Direct API posting to groups is no longer supported
  - **Workaround**: Must use browser automation or alternative approaches for group posting

#### 5. Page Posting Capabilities
- Can publish posts to the Page feed via `/me/feed` endpoint
- Supports text, images, videos, and structured content
- Can schedule posts for future publication
- Can retrieve post history and analytics

### Architecture Implications

**For Group Posting**: Since the Groups API is deprecated, the system needs to:
1. Store group information (ID, name, location) in database
2. Use a polling mechanism or webhook to detect when to post
3. Either:
   - Use browser automation (Puppeteer/Playwright) to post to groups as the Page
   - Integrate with third-party group posting services
   - Implement a manual approval workflow where posts are queued for manual publication

**Recommended Approach**: 
- Use official Graph API for Page messaging and Page feed posting
- Implement scheduled task system for group posting (via browser automation or manual workflow)
- Store all posts and messages in database for history/audit trail

### Next Steps
1. Design database schema for Pages, Groups, Posts, Messages, and Tone configurations
2. Set up Facebook App and request necessary permissions
3. Implement OAuth flow for Page connection
4. Build UI for group management and post scheduling
