# Workhole Backend

A robust backend for Workhole HR & Attendance system, built with NestJS and MongoDB.

This API covers authentication, users, attendance, leaves, breaks, timer focus, notifications, and dashboard analytics.

## Table of Contents

- [Setup & Environment](#setup--environment)
- [Authentication](#authentication)
- [Users](#users)
- [Attendance](#attendance)
- [Leaves](#leaves)
- [Breaks](#breaks)
- [Timer Focus](#timer-focus)
- [Notifications](#notifications)
- [Dashboard](#dashboard)
- [Error Handling](#error-handling)
- [File Uploads](#file-uploads)
- [Notes for Frontend](#notes-for-frontend)

## Setup & Environment

### Clone the repo:

```bash
git clone https://github.com/your-org/workhole-backend.git
cd workhole-backend
```

### Install dependencies:

```bash
npm install
```

### Configure .env:

```env
MONGO_URL=mongodb+srv://workhole:workhole12@workhole.fgldlpc.mongodb.net/?retryWrites=true&w=majority&appName=WorkHole
PORT=5000
JWT_SECRET_KEY=8351b5653b7d6aca860effd7f26b8893450b725daff2a4435b32177188a61c52f2ed0f57eae5166509f8
JWT_EXPIRES_IN=1d
EMAIL_USER=bedowael365@gmail.com
EMAIL_PASS=xbgibcnkndbdkzfa
```

### Run the server:

```bash
npm run start:dev
```

---

## Authentication

### Register

- **POST** `/auth/register`
- **Body:** `form-data` (Text/File)

| Key | Example Value | Type | Required |
|-----|---------------|------|----------|
| firstName | Ahmed | Text | Yes |
| lastName | Ali | Text | Yes |
| email | ahmed@email.com | Text | Yes |
| password | secret123 | Text | Yes |
| role | employee | Text | Yes |
| shiftHours | 8 | Text | Yes |
| shiftStartLocal | 09:00 | Text | No |
| locale | en | Text | No |
| isActive | true | Text | No |
| availableLeaves | 21 | Text | No |
| profileImage | (choose file) | File | No |
| salary | 5000 | Text | No |
| phone | 01012345678 | Text | No |
| status | active | Text | No |

- **Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "firstName": "Ahmed",
    "lastName": "Ali",
    "email": "ahmed@email.com",
    "role": "employee",
    "shiftHours": 8,
    "locale": "en",
    "isActive": true,
    "availableLeaves": 21,
    "profileImage": "/images/profileImages/profile.svg"
  }
}
```

### Login

- **POST** `/auth/login`
- **Body:** JSON
```json
{
  "email": "ahmed@email.com",
  "password": "secret123"
}
```
- **Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "firstName": "Ahmed",
    "lastName": "Ali",
    "email": "ahmed@email.com",
    "role": "employee",
    "shiftHours": 8,
    "locale": "en",
    "isActive": true,
    "availableLeaves": 21,
    "profileImage": "/images/profileImages/profile.svg"
  }
}
```

### Refresh Token

- **POST** `/auth/refresh`
- **Body:** JSON
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "firstName": "Ahmed",
    "lastName": "Ali",
    "email": "ahmed@email.com",
    "role": "employee",
    "shiftHours": 8,
    "locale": "en",
    "isActive": true,
    "availableLeaves": 21,
    "profileImage": "/images/profileImages/profile.svg"
  }
}
```

### Forget Password

- **POST** `/auth/forget-password`
- **Body:** JSON
```json
{ "email": "ahmed@email.com" }
```
- **Response:**
```json
{ "message": "If this email exists, a code will be sent." }
```

### Reset Password

- **POST** `/auth/reset-password`
- **Body:** JSON
```json
{
  "email": "ahmed@email.com",
  "code": "123456",
  "newPassword": "newpass123"
}
```
- **Response:**
```json
{ "message": "Password reset successfully" }
```

### Get Current User

- **GET** `/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "id": "user_id",
  "firstName": "Ahmed",
  "lastName": "Ali",
  "email": "ahmed@email.com",
  "role": "employee",
  "shiftHours": 8,
  "locale": "en",
  "isActive": true,
  "availableLeaves": 21,
  "profileImage": "/images/profileImages/profile.svg",
  "status": "active",
  "salary": 5000,
  "shiftStartLocal": "09:00",
  "phone": "01012345678",
  "holidays": ["saturday", "sunday"],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Upload Profile Image

- **PUT** `/auth/upload-profile`
- **Body:** `form-data`

| Key | Type |
|-----|------|
| profileImage | File |

- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "message": "Profile image updated successfully",
  "profileImage": "/images/profileImages/filename.jpg"
}
```

### Update Profile

- **PUT** `/auth/update-profile`
- **Body:** `form-data` (Text/File)

| Key | Type | Required |
|-----|------|----------|
| firstName | Text | No |
| lastName | Text | No |
| phone | Text | No |
| profileImage | File | No |

- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "firstName": "Ahmed",
    "lastName": "Ali",
    "phone": "01012345678",
    "profileImage": "/images/profileImages/filename.jpg",
    "email": "ahmed@email.com",
    "role": "employee",
    "shiftHours": 8,
    "locale": "en",
    "isActive": true,
    "availableLeaves": 21,
    "status": "active",
    "salary": 5000,
    "shiftStartLocal": "09:00"
  }
}
```

### Logout

- **POST** `/auth/logout`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{ "message": "Logged out successfully" }
```

---

## Users

> **All endpoints require admin role unless stated otherwise.**

### Create User

- **POST** `/api/users`
- **Body:** JSON
```json
{
  "firstName": "Ahmed",
  "lastName": "Ali",
  "email": "ahmed@email.com",
  "password": "secret123",
  "role": "employee",
  "shiftHours": 8,
  "shiftStartLocal": "09:00",
  "locale": "en",
  "isActive": true,
  "salary": 5000,
  "phone": "01012345678",
  "status": "active",
  "availableLeaves": 21,
  "profileImage": "/images/profileImages/profile.svg",
  "holidays": ["saturday", "sunday"]
}
```
- **Headers:** `Authorization: Bearer <token>`
- **Response:** User object

### Get All Users

- **GET** `/api/users`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Array of user objects

### Get User

- **GET** `/api/users/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** User object

### Update User

- **PUT** `/api/users/:id`
- **Body:** JSON (partial user data)
```json
{
  "firstName": "Ahmed Updated",
  "lastName": "Ali Updated",
  "phone": "01098765432",
  "holidays": ["friday", "saturday", "sunday"]
}
```
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Updated user object

### Delete User

- **DELETE** `/api/users/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{ "message": "User deleted successfully" }
```

---

## Attendance

### Clock In

- **POST** `/api/attendance/clock-in`
- **Body:** JSON
```json
{
  "latitude": 30.123,
  "longitude": 31.456
}
```
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "attendance": {
    "userId": "user_id",
    "date": "2025-08-24",
    "dayName": "Sunday",
    "clockIn": "09:15",
    "status": "present",
    "location": "office",
    "officeName": "Main Office"
  },
  "warning": null
}
```

### Clock Out

- **POST** `/api/attendance/clock-out`
- **Body:** JSON
```json
{
  "latitude": 30.123,
  "longitude": 31.456
}
```
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "attendance": {
    "clockOut": "17:30",
    "workMinutes": 495,
    "isOvertime": true,
    "location": "office",
    "officeName": "Main Office"
  },
  "warning": null
}
```

### Get My Dashboard

- **GET** `/api/attendance/me?filter=week`
- **Query Parameters:**
  - `filter`: `week` | `month` (default: `week`)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "dailyShift": "8h 15m",
  "thisWeek": "35h 30m",
  "breaksTaken": "45m",
  "breaksCount": 3,
  "totalOvertime": "2h 15m",
  "currentStatus": "Clocked In",
  "activeWorkTime": "7h 30m",
  "todayProgress": "8h 15m / 8h",
  "efficiency": 94,
  "completedShift": 103,
  "remainingTime": "0h",
  "mostProductiveDay": {
    "day": "Monday",
    "time": "9h 30m"
  },
  "workHoursChart": [
    {
      "label": "Mon",
      "hours": 8.5
    },
    {
      "label": "Tue", 
      "hours": 7.2
    }
  ],
  "clockInTime": "2025-08-24T06:15:00.000Z",
  "todayAttendance": {
    "clockIn": "09:15",
    "clockOut": null
  }
}
```

### Get My Attendance Logs (Paginated)

- **GET** `/api/attendance/stats?page=1&limit=8`
- **Query Parameters:**
  - `page`: number (default: 1)
  - `limit`: number (default: 8)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "totalDaysPresent": 9,
  "totalDaysAbsent": 0,
  "lateArrivals": 5,
  "avgClockIn": "9:43 AM",
  "attendanceLogs": [
    {
      "date": "2025-08-24",
      "day": "Sunday",
      "checkInTime": "09:15",
      "checkOutTime": "17:30",
      "workHours": "8h 15m",
      "status": "present",
      "location": "office",
      "officeName": "Main Office"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 8,
    "total": 20,
    "totalPages": 3
  }
}
```

### Admin: Get All Users Attendance

- **GET** `/api/attendance/all?range=today`
- **Query Parameters:**
  - `range`: `today` | `lastWeek` | `lastMonth` (default: `today`)
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Array of attendance records with user details

### Admin: Set Office Location

- **POST** `/api/attendance/set-office-location`
- **Body:** JSON
```json
{
  "latitude": 30.123,
  "longitude": 31.456,
  "name": "Main Office",
  "address": "123 Business St, Cairo",
  "radius": 100
}
```
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Office location object

### Admin: Get All Offices

- **GET** `/api/attendance/offices`
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Array of office locations

### Admin: Edit Office

- **POST** `/api/attendance/edit-office`
- **Body:** JSON
```json
{
  "id": "office_id",
  "name": "Updated Office Name",
  "address": "Updated Address",
  "latitude": 30.123,
  "longitude": 31.456,
  "radius": 150
}
```
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Updated office location object

### Admin: Delete Office

- **POST** `/api/attendance/delete-office`
- **Body:** JSON
```json
{
  "id": "office_id"
}
```
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Success message

---

## Leaves

### Create Leave Request

- **POST** `/api/leaves`
- **Body:** `form-data` or JSON

| Key | Example Value | Type | Required |
|-----|---------------|------|----------|
| leaveType | Annual Leave | Text | Yes |
| startDate | 2025-09-01 | Text | Yes |
| endDate | 2025-09-05 | Text | Yes |
| reason | Family vacation | Text | Yes |
| attachment | (choose file) | File | No |

- **Headers:** `Authorization: Bearer <token>`
- **Response:** Leave object with populated user data

### Get My Leaves (Paginated)

- **GET** `/api/leaves/me?page=1&limit=6`
- **Query Parameters:**
  - `page`: number (default: 1)
  - `limit`: number (default: 6)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "leaves": [
    {
      "id": "leave_id",
      "leaveType": "Annual Leave",
      "startDate": "2025-09-01",
      "endDate": "2025-09-05",
      "days": 5,
      "status": "pending",
      "reason": "Family vacation",
      "attachmentUrl": "/images/leaveAttachments/file.pdf",
      "actionBy": null,
      "actionNote": null,
      "actionDate": null,
      "createdAt": "2025-08-24T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 6,
    "total": 18,
    "totalPages": 3
  }
}
```

### Get Leave Stats

- **GET** `/api/leaves/stats`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "leaveTypeCounts": {
    "annualLeaves": 5,
    "sickLeaves": 2,
    "emergencyLeaves": 1,
    "unpaidLeaves": 0
  },
  "statusCounts": {
    "pendingLeaves": 1,
    "approvedLeaves": 6,
    "rejectedLeaves": 1
  },
  "availableLeaves": 16,
  "totalAnnualLeaves": 21,
  "usedAnnualDays": 5
}
```

### Update My Leave (Pending Only)

- **PUT** `/api/leaves/:id`
- **Body:** JSON (partial leave data)
```json
{
  "startDate": "2025-09-02",
  "endDate": "2025-09-06",
  "reason": "Updated reason"
}
```
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Updated leave object

### Delete My Leave (Pending Only)

- **DELETE** `/api/leaves/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{ "message": "Leave deleted successfully" }
```

### Admin: Get All Leaves

- **GET** `/api/leaves/admin/all`
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Array of all leaves with user details

### Admin: Approve/Reject Leave

- **PUT** `/api/leaves/admin/:id/action`
- **Body:** JSON
```json
{
  "status": "approved",
  "actionNote": "Approved for annual leave"
}
```
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Updated leave object

---

## Breaks

### Create Break Type (Admin)

- **POST** `/api/break/type`
- **Body:** JSON
```json
{
  "name": "Prayer",
  "duration": 10,
  "isActive": true
}
```
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Break type object

### Update Break Type (Admin)

- **PUT** `/api/break/type/:id`
- **Body:** JSON (partial break type data)
```json
{
  "name": "Prayer Break",
  "duration": 15,
  "isActive": true
}
```
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Updated break type object

### Delete Break Type (Admin)

- **DELETE** `/api/break/type/:id`
- **Headers:** `Authorization: Bearer <token>` (admin role)
- **Response:** Success message

### Get Break Types

- **GET** `/api/break/types`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Array of active break types

### Start Break

- **POST** `/api/break/start`
- **Body:** JSON
```json
{ "breakType": "Prayer" }
```
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Break session object

### Stop Break

- **POST** `/api/break/stop`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Completed break session object

### Get My Break Dashboard

- **GET** `/api/break/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "todaysBreakTime": "45 min",
  "mostUsedBreak": "Prayer",
  "avgBreakPerDay": "30 min",
  "breaksOverLimit": 2,
  "breakTypeUsage": [
    {
      "type": "Prayer",
      "count": 5,
      "total": "50 min"
    }
  ]
}
```

### Get Break Stats (Paginated)

- **GET** `/api/break/stats?page=1&limit=4&sortBy=newest&date=&type=`
- **Query Parameters:**
  - `page`: number (default: 1)
  - `limit`: number (default: 4)
  - `sortBy`: `newest` | `oldest` (default: `newest`)
  - `date`: string (optional date filter)
  - `type`: string (optional break type filter)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "breaks": [
    {
      "date": "24 August 2025",
      "day": "Sunday",
      "breakType": "Prayer",
      "duration": "10 min",
      "startTime": "2025-08-24T09:00:00.000Z",
      "endTime": "2025-08-24T09:10:00.000Z",
      "exceeded": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 4,
    "total": 12,
    "totalPages": 3
  },
  "availableFilters": {
    "dates": ["24 August 2025", "23 August 2025"],
    "types": ["Prayer", "Lunch", "Coffee"]
  }
}
```

### Get Active Breaks Count

- **GET** `/api/break/active-count`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
5
```

---

## Timer Focus

### Start Timer

- **POST** `/api/timer/start`
- **Body:** JSON
```json
{
  "tag": "Coding API",
  "duration": 25
}
```
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "timer": {
    "id": "timer_id",
    "tag": "Coding API",
    "duration": 25,
    "startTime": "2025-08-24T09:00:00.000Z",
    "status": "running"
  }
}
```

### Get Current Timer

- **GET** `/api/timer/current`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "isRunning": true,
  "timer": {
    "id": "timer_id",
    "tag": "Coding API",
    "duration": 25,
    "elapsedSeconds": 900,
    "elapsedMinutes": 15,
    "remainingMinutes": 10,
    "startTime": "2025-08-24T09:00:00.000Z",
    "status": "running",
    "progress": 60,
    "totalPaused": 0,
    "pausedAt": null
  }
}
```

### Pause Timer

- **PUT** `/api/timer/:id/pause`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "message": "Timer paused successfully"
}
```

### Resume Timer

- **PUT** `/api/timer/:id/resume`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "message": "Timer resumed successfully"
}
```

### Complete Timer

- **PUT** `/api/timer/:id/complete`
- **Body:** JSON
```json
{ "note": "Successfully completed the task!" }
```
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "message": "Timer completed successfully",
  "actualDuration": 1500
}
```

### Cancel Timer

- **PUT** `/api/timer/:id/cancel`
- **Body:** JSON
```json
{ "note": "Interrupted by meeting" }
```
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "message": "Timer cancelled successfully",
  "actualDuration": 900
}
```

### Get Timer Logs

- **GET** `/api/timer/logs`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Array of timer logs

### Get Weekly Focus Time

- **GET** `/api/timer/time`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "totalMinutes": 500,
  "formattedTime": "8h 20m",
  "sessionsCount": 20
}
```

---

## Notifications

### Get My Notifications

- **GET** `/api/notifications/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
[
  {
    "_id": "notification_id",
    "userId": "user_id",
    "type": "leave",
    "title": "Leave Approved",
    "message": "Your leave request has been approved.",
    "status": "unread",
    "lang": "en",
    "createdAt": "2025-08-24T09:00:00.000Z"
  }
]
```

### Mark Notification as Read

- **POST** `/api/notifications/:id/read`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Success message

### Create Notification (Internal Use)

- **POST** `/api/notifications`
- **Body:** JSON
```json
{
  "userId": "user_id",
  "type": "leave",
  "title": "Leave Approved",
  "message": "Your leave request has been approved."
}
```
- **Response:** Created notification object

---

## Dashboard

### Get My Dashboard

- **GET** `/api/dashboard/me?month=8`
- **Query Parameters:**
  - `month`: number (optional, defaults to current month)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "currentStatus": "Clocked In",
  "leaveStatus": "pending",
  "dailyShift": "8h 15m",
  "clockIn": "09:15",
  "heatChart": {
    "month": 8,
    "year": 2025,
    "weeks": [
      {
        "weekNumber": 1,
        "days": [
          {
            "date": "2025-07-28",
            "workHours": 0,
            "isCurrentMonth": false,
            "dayOfMonth": 28,
            "dayOfWeek": 0
          }
        ]
      }
    ]
  },
  "currentMonth": 8,
  "currentYear": 2025
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

### Common Error Codes:

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## File Uploads

### Profile Images

- **Endpoints:** `/auth/register` and `/auth/upload-profile`
- **Form key:** `profileImage`
- **Allowed types:** JPG, JPEG, PNG, GIF
- **Max size:** 5MB
- **Served at:** `/images/profileImages/`

### Leave Attachments

- **Endpoint:** `/api/leaves`
- **Form key:** `attachment`
- **Allowed types:** PDF, DOC, DOCX, JPG, JPEG, PNG
- **Max size:** 10MB
- **Served at:** `/images/leaveAttachments/`

---

## Notes for Frontend

### Authentication

- Store JWT token in localStorage/sessionStorage
- Include token in Authorization header: `Bearer <token>`
- Token expires in 48 hours (access token) and 20 days (refresh token)
- Use refresh token to get new access token when expired

### Form Data vs JSON

- Registration & File uploads: Use `form-data`
- All other endpoints: Use JSON
- When using `form-data`, send booleans and numbers as strings

### Pagination

- Most list endpoints support pagination
- Use `page` and `limit` query parameters
- Default limits: Attendance (8), Leaves (6), Breaks (4)

### Validation

- All boolean fields accept `"true"`/`"false"` strings in form-data
- All number fields accept string representations in form-data
- Date fields use ISO format: `"YYYY-MM-DD"`

### Notifications

- All notifications are automatically created for relevant events
- Notifications support both English and Arabic
- Events that trigger notifications:
  - Leave requests (submit, approve, reject, update, delete)
  - Break activities (start, warning, exceed, end)
  - Attendance (clock in/out, late arrival, overtime)
  - Timer activities (start, complete, cancel)
  - Account changes (password reset)

### Email Notifications

- Emails are sent for most major events
- Email templates are predefined
- Users receive emails for their own actions
- Admins receive emails for leave requests

### API Rate Limiting

- Rate limit: 15 requests per minute
- Throttling: Enabled globally
- Bypass: Not available for any endpoints

### CORS Configuration

- Allowed origins: `http://localhost:3000`, `http://localhost:5173`, `https://work-hole.vercel.app`, `https://diethub-workhole.vercel.app`
- Credentials: Enabled
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS

---

## Environment Variables Reference

```env
# Database
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/database

# Server
PORT=5000

# JWT Configuration
JWT_SECRET_KEY=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=1d

# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

---

## Project Structure

```
src/
├── auth/                 # Authentication module
├── users/                # User management
├── attendance/           # Clock in/out, attendance tracking
├── leaves/               # Leave requests and management
├── break/                # Break types and tracking
├── timerFocus/           # Focus timer functionality
├── notifications/        # Notification system
├── dashboard/            # Dashboard analytics
├── mail/                 # Email service
├── config/               # Database configuration
├── middleware/           # File upload configuration
└── common/               # Shared utilities and guards
```

---

## Contact & Contribution

For issues or contributions, create an issue or pull request in the repository.

---

## License

This project is licensed under the MIT License.
