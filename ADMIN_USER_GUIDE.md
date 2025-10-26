# JAMALERT Admin User Guide

**Version:** 1.0  
**Last Updated:** October 23, 2025  
**For:** System Administrators and Emergency Management Personnel

## Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Dashboard](#admin-dashboard)
3. [User Management](#user-management)
4. [Incident Reports Management](#incident-reports-management)
5. [Alert Management](#alert-management)
6. [System Health Monitoring](#system-health-monitoring)
7. [Audit Logs](#audit-logs)
8. [Best Practices](#best-practices)

---

## Getting Started

### Admin Credentials

**Primary Admin Account:**
- Email: `admin@jamalert.com`
- Password: `admin123`
- Role: System Administrator
- Access Level: Full system access

**Demo Admin Account:**
- Email: `demo@jamalert.com`
- Password: `demo123`
- Role: Administrator
- Access Level: Full system access

⚠️ **Security Note:** Change these default passwords immediately in production!

### Accessing the Admin Panel

1. Navigate to: `http://localhost:3000/admin/login`
2. Enter admin credentials
3. Click "Sign In"
4. You will be redirected to the Admin Dashboard

### Admin Navigation

The admin panel includes 6 main sections accessible from the sidebar:

1. **Dashboard** - Overview and statistics
2. **User Management** - Manage registered users
3. **Incident Reports** - Review community reports
4. **Alert Management** - Create and send alerts
5. **System Health** - Monitor system performance
6. **Audit Logs** - View admin action history

---

## Admin Dashboard

**Route:** `/admin/dashboard`

### Overview

The dashboard provides a high-level view of the JAMALERT system status and key metrics.

### Key Metrics Displayed

#### 1. Total Users
- **Display:** Total number of registered users
- **Sub-metric:** Number of active users
- **Example:** "1,247 total users / 892 active users"

#### 2. Incident Reports
- **Display:** Total number of incident reports
- **Sub-metric:** Number of pending reports requiring review
- **Example:** "156 total reports / 8 pending review"

#### 3. Alerts Sent
- **Display:** Total number of alerts sent
- **Sub-metric:** Number of alerts sent today
- **Example:** "89 total alerts / 3 sent today"

#### 4. System Health
- **Display:** Overall system status
- **Indicators:**
  - 🟢 **Healthy:** All systems operational
  - 🟡 **Warning:** Some degradation detected
  - 🔴 **Error:** Critical issues present
- **Sub-metrics:** System uptime percentage

### Quick Actions

From the dashboard, you can:
- View recent alerts
- See pending incident reports
- Monitor system performance
- Access quick links to other admin sections

---

## User Management

**Route:** `/admin/users`

### Overview

Manage all registered JAMALERT users, view their details, and control account status.

### Features

#### 1. User List View

**Columns Displayed:**
- **User:** Name and User ID
- **Contact:** Email and phone number
- **Parish:** User's registered parish
- **Alerts:** Alert preferences (Email/SMS/Emergency Only)
- **Status:** Active or Inactive
- **Joined:** Registration date
- **Actions:** User management options

#### 2. Search and Filter

**Search:**
- Search by name, email, or user ID
- Real-time filtering as you type

**Filters:**
- **Parish:** Filter users by parish
  - All Parishes
  - Kingston
  - St. Andrew
  - St. Catherine
  - ... (all 14 parishes)

- **Status:** Filter by account status
  - All Users
  - Active Only
  - Inactive Only

- **Alert Preferences:**
  - All Users
  - Email Alerts Enabled
  - SMS Alerts Enabled
  - Emergency Only

#### 3. User Actions

**Available Actions:**
- **Deactivate User:** Temporarily disable a user account
  - User will not receive any alerts
  - Account can be reactivated later
  - Use for: Spam accounts, user requests, policy violations

- **Activate User:** Re-enable a deactivated account
  - Restores all alert preferences
  - User can log in again

**How to Perform Actions:**
1. Locate the user in the table
2. Click the three-dot menu (⋮) in the Actions column
3. Select "Deactivate" or "Activate"
4. Confirm the action

#### 4. User Details

**Information Displayed:**
- Full name (First + Last)
- Unique User ID
- Email address
- Phone number (if provided)
- Parish location
- Community (if specified)
- Alert preferences:
  - ✅ Email alerts enabled/disabled
  - ✅ SMS alerts enabled/disabled
  - ✅ Emergency only mode
- Account status (Active/Inactive)
- Registration date

### Use Cases

**Scenario 1: Finding Users in a Specific Parish**
1. Go to User Management
2. Select parish from "Filter by Parish" dropdown
3. View all users in that parish
4. Export or take action as needed

**Scenario 2: Deactivating a Spam Account**
1. Search for the user by email or name
2. Click the three-dot menu
3. Select "Deactivate"
4. User account is immediately disabled

**Scenario 3: Viewing Alert Preferences**
1. Locate user in the table
2. Check the "Alerts" column
3. See which alert types are enabled
4. Icons indicate: 📧 Email, 📱 SMS, ⚠️ Emergency Only

---

## Incident Reports Management

**Route:** `/admin/incidents`

### Overview

Review, approve, reject, and manage community-submitted incident reports.

### Features

#### 1. Incident List View

**Columns Displayed:**
- **Incident:** Type and severity badge
- **Location:** Parish and community
- **Reporter:** User who submitted the report
- **Status:** Current review status
- **Date:** When the report was submitted
- **Actions:** Review options

#### 2. Incident Types

- **Flooding:** Water accumulation, flash floods
- **Road Closure:** Blocked or impassable roads
- **Landslide:** Soil/rock movement
- **Fallen Tree:** Trees blocking roads/areas
- **Power Outage:** Electrical service disruption
- **Other:** Miscellaneous incidents

#### 3. Severity Levels

- 🔴 **High:** Immediate danger, requires urgent response
- 🟡 **Medium:** Significant impact, needs attention
- 🟢 **Low:** Minor issue, informational

#### 4. Report Status

- **Pending:** Awaiting admin review
- **Approved:** Verified and accepted
- **Rejected:** Determined to be invalid/spam
- **Resolved:** Issue has been addressed

#### 5. Search and Filter

**Search:**
- Search by location, description, or reporter

**Filters:**
- **Incident Type:** Filter by specific incident types
- **Severity:** Filter by severity level
- **Status:** Filter by review status
- **Parish:** Filter by location

#### 6. Review Process

**How to Review an Incident:**

1. **View Details:**
   - Click "Review" button on any incident
   - Dialog opens with full incident details

2. **Information Displayed:**
   - Incident type and severity
   - Location (parish + community)
   - Detailed description
   - Reporter information
   - Submission timestamp
   - Photos (if uploaded)
   - GPS coordinates (if available)

3. **Review Actions:**
   - **Approve:** Verify the incident is legitimate
     - Incident marked as "Approved"
     - Can trigger automatic alerts if configured
     - Adds to incident database for analytics
   
   - **Reject:** Mark as invalid or spam
     - Incident marked as "Rejected"
     - Optional: Add review note explaining why
     - Reporter may be notified (if configured)

4. **Add Review Notes:**
   - Optional text field for internal notes
   - Helps track decision reasoning
   - Visible in audit logs

**Best Practices:**
- Review incidents promptly (within 1 hour for high severity)
- Add notes for rejected incidents
- Cross-reference with weather data
- Check for duplicate reports
- Verify location makes sense

### Use Cases

**Scenario 1: Approving a Flood Report**
1. Filter by "Flooding" incident type
2. Click "Review" on pending report
3. Verify details and location
4. Add note: "Confirmed with weather data"
5. Click "Approve"
6. Report is marked approved

**Scenario 2: Handling Duplicate Reports**
1. Notice multiple reports for same location
2. Review all reports
3. Approve the most detailed one
4. Reject duplicates with note: "Duplicate of report #123"

**Scenario 3: Emergency Response**
1. Filter by "High" severity
2. Review urgent incidents first
3. Approve legitimate emergencies
4. Coordinate with emergency services
5. Send targeted alerts to affected areas

---

## Alert Management

**Route:** `/admin/alerts`

### Overview

Create, send, and manage emergency alerts to JAMALERT users.

### Features

#### 1. Send New Alert

**How to Create an Alert:**

1. **Click "Send Alert" Button**
   - Opens alert creation dialog

2. **Fill in Alert Details:**

   **Alert Type:** (Required)
   - Flood Warning
   - Weather Alert
   - Emergency Alert
   - All Clear

   **Severity:** (Required)
   - 🔴 High: Life-threatening situations
   - 🟡 Medium: Significant risk
   - 🟢 Low: Advisory/informational

   **Title:** (Required)
   - Short, clear headline
   - Example: "Flash Flood Warning - Kingston"
   - Max 255 characters

   **Message:** (Required)
   - Detailed alert information
   - Include:
     - What is happening
     - Where it's happening
     - What actions to take
     - When to expect updates
   - Example: "Heavy rainfall has caused flash flooding in downtown Kingston. Avoid low-lying areas. Seek higher ground immediately. Updates every 30 minutes."

   **Select Parishes:** (Required)
   - Choose one or more affected parishes
   - Multi-select dropdown
   - Can select all parishes for island-wide alerts

   **Expiration Time:** (Optional)
   - Set when alert should expire
   - Default: 24 hours
   - Expired alerts are archived

3. **Preview Alert:**
   - Review all details
   - Check parish selection
   - Verify message clarity

4. **Send Alert:**
   - Click "Send Alert" button
   - Confirmation dialog appears
   - Confirm to send immediately

**Alert Delivery:**
- Sent to all active users in selected parishes
- Delivered via enabled channels (email/SMS)
- Respects user preferences (emergency only mode)
- Delivery status tracked in real-time

#### 2. Alert History

**View Past Alerts:**
- Table showing all sent alerts
- Columns:
  - Alert title and type
  - Severity level
  - Affected parishes
  - Created by (admin email)
  - Created date/time
  - Delivery status
  - Recipient count
  - Delivered count
  - Failed count

**Delivery Status:**
- **Sending:** Alert is being delivered
- **Delivered:** Successfully sent to all recipients
- **Partial:** Some deliveries failed
- **Failed:** Alert delivery failed

**Metrics:**
- **Recipient Count:** Total users targeted
- **Delivered Count:** Successfully delivered
- **Failed Count:** Delivery failures

#### 3. Alert Templates (Future Feature)

Save frequently used alert messages as templates for quick sending.

### Best Practices

**When to Send Alerts:**
- ✅ Verified emergencies
- ✅ Official weather warnings
- ✅ Confirmed flooding events
- ✅ Road closures affecting safety
- ✅ All-clear notifications

**When NOT to Send Alerts:**
- ❌ Unverified reports
- ❌ Minor incidents
- ❌ Test messages (use test mode)
- ❌ Non-emergency information

**Alert Writing Guidelines:**
1. **Be Clear:** Use simple, direct language
2. **Be Specific:** Include exact locations
3. **Be Actionable:** Tell people what to do
4. **Be Timely:** Send as soon as verified
5. **Be Accurate:** Double-check all information

**Example Good Alert:**
```
Title: Flash Flood Warning - Harbour View
Severity: High
Message: Flash flooding is occurring in Harbour View, Kingston. 
Water levels rising rapidly. Evacuate low-lying areas immediately. 
Move to higher ground. Avoid driving through flooded roads. 
Emergency services are responding. Next update in 30 minutes.
```

**Example Poor Alert:**
```
Title: Flooding
Severity: Medium
Message: There might be some flooding somewhere. Be careful.
```

### Use Cases

**Scenario 1: Sending a Flash Flood Warning**
1. Receive verified flood report
2. Click "Send Alert"
3. Select "Flood Warning" type
4. Set severity to "High"
5. Write clear, actionable message
6. Select affected parish (e.g., Kingston)
7. Review and send
8. Monitor delivery status

**Scenario 2: Sending an All-Clear**
1. Confirm flooding has subsided
2. Create "All Clear" alert
3. Set severity to "Low"
4. Message: "Flood waters have receded in Harbour View. Roads are now passable. Exercise caution in affected areas."
5. Send to same parishes as original warning

**Scenario 3: Island-Wide Weather Alert**
1. Receive hurricane warning from Met Service
2. Create "Weather Alert"
3. Set severity to "High"
4. Select ALL parishes
5. Include official Met Service information
6. Send immediately

---

## System Health Monitoring

**Route:** `/admin/health`

### Overview

Monitor the health and performance of all JAMALERT system components.

### Features

#### 1. Overall System Status

**Health Indicators:**
- 🟢 **Healthy:** All systems operational (95-100%)
- 🟡 **Degraded:** Some issues detected (70-94%)
- 🔴 **Unhealthy:** Critical problems (<70%)

**Metrics Displayed:**
- Overall health percentage
- System uptime
- Last health check timestamp
- System version

#### 2. Component Health Checks

**Database:**
- Status: Healthy/Degraded/Unhealthy
- Response time (ms)
- Connection pool status
- Last successful query

**Weather API:**
- Status: Healthy/Degraded/Unhealthy
- API response time
- Last successful fetch
- Rate limit status

**Email Service:**
- Status: Healthy/Degraded/Unhealthy
- Email queue size
- Delivery success rate
- Last email sent

**SMS Service:**
- Status: Healthy/Degraded/Unhealthy
- SMS queue size
- Delivery success rate
- Twilio account status

**Application:**
- Memory usage
- CPU usage
- Active connections
- Error rate

#### 3. Performance Metrics

**Alert Delivery Times:**
- Average delivery time
- 95th percentile (P95)
- 99th percentile (P99)

**API Response Times:**
- Per endpoint metrics
- Average response time
- Request count

**Error Rates:**
- Errors per service
- Error percentage
- Recent error log

**Resource Usage:**
- Function executions (Azure)
- Database connections
- Storage used
- Bandwidth consumed

#### 4. Usage Metrics

- Total users
- Active users (last 30 days)
- Alerts sent (total and today)
- Incident reports submitted
- Database queries executed
- Storage space used

### Monitoring Best Practices

**Daily Checks:**
- Review overall system health
- Check for degraded services
- Monitor error rates
- Verify alert delivery times

**Weekly Reviews:**
- Analyze performance trends
- Review resource usage
- Check for capacity issues
- Plan for scaling if needed

**Alert Thresholds:**
- Set up notifications for:
  - System health < 90%
  - Database response time > 500ms
  - Error rate > 5%
  - Alert delivery time > 30 seconds

---

## Audit Logs

**Route:** `/admin/audit`

### Overview

View a complete history of all administrative actions for compliance and security.

### Features

#### 1. Audit Log Entries

**Information Logged:**
- Admin user who performed action
- Action type (create, update, delete, etc.)
- Resource affected (user, alert, incident)
- Timestamp
- IP address
- Result (success/failure)
- Additional details

#### 2. Searchable History

**Search By:**
- Admin user
- Action type
- Date range
- Resource type

**Filter By:**
- Time period (today, week, month, custom)
- Action result (success/failure)
- Specific admin user

#### 3. Compliance

All admin actions are logged for:
- Security auditing
- Compliance requirements
- Incident investigation
- Performance review

---

## Best Practices

### Security

1. **Change Default Passwords:**
   - Change admin passwords immediately
   - Use strong, unique passwords
   - Enable 2FA when available

2. **Access Control:**
   - Only grant admin access to authorized personnel
   - Review admin accounts regularly
   - Deactivate unused admin accounts

3. **Session Management:**
   - Log out when finished
   - Don't share admin credentials
   - Use secure connections (HTTPS)

### Alert Management

1. **Verify Before Sending:**
   - Confirm incident reports
   - Cross-check with official sources
   - Verify location accuracy

2. **Clear Communication:**
   - Use simple language
   - Include specific locations
   - Provide actionable instructions

3. **Timely Updates:**
   - Send alerts promptly
   - Provide regular updates
   - Send all-clear when appropriate

### User Management

1. **Privacy:**
   - Respect user data privacy
   - Only access user data when necessary
   - Follow data protection policies

2. **Fair Treatment:**
   - Document reasons for deactivation
   - Provide clear communication
   - Allow appeals process

### System Monitoring

1. **Regular Checks:**
   - Monitor system health daily
   - Review performance metrics weekly
   - Address issues promptly

2. **Proactive Maintenance:**
   - Schedule regular maintenance
   - Update system components
   - Test backup systems

---

## Support and Troubleshooting

### Common Issues

**Issue: Alert not sending**
- Check system health
- Verify user has alerts enabled
- Check delivery logs
- Verify API credentials

**Issue: Slow performance**
- Check system health metrics
- Review database performance
- Check API response times
- Consider scaling resources

**Issue: User can't receive alerts**
- Verify user is active
- Check alert preferences
- Verify contact information
- Check delivery logs

### Getting Help

For technical support:
- Email: support@jamalert.jm
- Phone: +1-876-XXX-XXXX
- Documentation: /docs

---

**End of Admin User Guide**

*This guide is subject to updates as new features are added to the JAMALERT system.*

