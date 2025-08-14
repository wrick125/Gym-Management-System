# 🏋️ Gym Management System

A modern, responsive web application for managing gym memberships, billing, and member services. Built with vanilla JavaScript, Firebase, and modern CSS.

## ✨ Features

### 🔐 Authentication & Security
- Secure user authentication with Firebase Auth
- Role-based access control (Admin/Member)
- Protected routes and data access
- Session management

### 👥 Member Management
- Add, update, and delete members
- Member profile management
- Membership status tracking
- Package assignments
- Search and filter functionality

### 💰 Billing System
- Create and manage bills
- Multiple payment statuses (Paid, Due, Overdue)
- Receipt generation
- Payment tracking
- Financial reporting

### 📦 Package Management
- Create custom membership packages
- Pricing and duration management
- Package descriptions
- Package assignment to members

### 🔔 Notifications
- Send notifications to all members
- Targeted notifications (Premium/Basic members)
- Real-time notification display
- Notification history

### 🏪 Supplement Store
- Product catalog management
- Stock tracking
- Pricing management
- Product descriptions
- Inventory status

### 🥗 Diet Plans
- Personalized diet plan assignment
- Diet plan management per member
- Plan updates and tracking
- Rich text formatting

### 📊 Dashboard & Analytics
- Real-time statistics
- Revenue tracking
- Member count analytics
- Activity monitoring
- Export functionality (CSV)

### 📱 Responsive Design
- Mobile-first approach
- Modern UI/UX design
- Cross-browser compatibility
- Touch-friendly interface

## 🚀 Quick Start

### Prerequisites
- Modern web browser
- Firebase account
- Basic knowledge of HTML, CSS, and JavaScript

### Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Follow the setup wizard

2. **Enable Authentication**
   - In Firebase Console, go to Authentication
   - Click "Get started"
   - Enable "Email/Password" provider

3. **Create Firestore Database**
   - Go to Firestore Database
   - Click "Create database"
   - Choose "Start in test mode" (for development)
   - Select a location

4. **Get Firebase Config**
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps"
   - Click "Add app" → Web app
   - Copy the config object

5. **Update Configuration**
   - Open `firebase.js`
   - Replace the `firebaseConfig` object with your own

### Installation

1. **Clone or Download**
   ```bash
   git clone <repository-url>
   cd gym-management-system
   ```

2. **Setup Firebase**
   - Update `firebase.js` with your Firebase configuration
   - Ensure Firestore rules allow read/write access

3. **Run the Application**
   - Open `index.html` in a web browser
   - Or use a local server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx serve .
     
     # Using PHP
     php -S localhost:8000
     ```

4. **Create Admin Account**
   - Register a new account
   - Select "Admin" role
   - Use this account to manage the system

## 📁 Project Structure

```
gym-management-system/
├── index.html              # Login/Register page
├── admin.html              # Admin dashboard
├── member.html             # Member dashboard
├── firebase.js             # Firebase configuration
├── auth.js                 # Authentication logic
├── style.css               # Main stylesheet
├── js/
│   ├── admin.js            # Admin functionality
│   └── member.js           # Member functionality
└── README.md               # This file
```

## 🔧 Configuration

### Firebase Security Rules

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admins can access all data
    match /{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Recommended Firestore Indexes

For fast queries and pagination, create these indexes in Firestore (Console → Firestore Database → Indexes):

- Collection: `members`
  - Single-field: `name` Ascending, `email` Ascending
- Collection: `bills`
  - Single-field: `date` Descending, `status` Ascending, `receiptNo` Ascending
- Collection: `storeItems`
  - Single-field: `name` Ascending

If you see Firestore error messages about missing indexes, click the generated link to auto-create the required index.

### Environment Variables

For production deployment, consider using environment variables for Firebase configuration.

## 🎨 Customization

### Styling
- Modify `style.css` to change colors, fonts, and layout
- CSS variables are defined in `:root` for easy customization
- Responsive breakpoints are included for mobile optimization

### Functionality
- Add new features by extending the JavaScript modules
- Modify Firebase queries for custom data requirements
- Add new export formats or reporting features

## 📊 Data Collections

The system uses the following Firestore collections:

- **users**: User authentication and profile data
- **members**: Gym member information
- **bills**: Billing and payment records
- **packages**: Membership package definitions
- **notifications**: System notifications
- **storeItems**: Supplement store inventory
- **diets**: Member diet plans

## 🔒 Security Features

- Firebase Authentication for user management
- Role-based access control
- Data validation and sanitization
- Secure API calls
- Protected routes

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🚀 Deployment

### Static Hosting
- Firebase Hosting
- Netlify
- Vercel
- GitHub Pages

### Server Hosting
- Any web server supporting static files
- Apache/Nginx configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the Firebase documentation
- Review the code comments for implementation details

## 🔄 Updates

### Version 2.0 Features
- Enhanced UI/UX design
- Improved error handling
- Better mobile responsiveness
- Advanced search and filtering
- Real-time notifications
- Export functionality
- Dashboard analytics
- Activity tracking

### Future Enhancements
- Payment gateway integration
- SMS notifications
- Mobile app development
- Advanced reporting
- Member check-in system
- Equipment tracking
- Class scheduling

---

**Built with ❤️ using Firebase and modern web technologies** 