// EmailJS Configuration
// Replace these with your actual EmailJS values after setting up your account

export const emailjsConfig = {
  serviceId: 'service_yqd4qe8',     // Your Gmail service ID
  templateId: 'template_r0mcsum',   // Your email template ID
  publicKey: 'rUl2CtcD-e7z_A9GK',  // Your public key
};

// Instructions for EmailJS Setup:
// 1. Go to https://www.emailjs.com and create a free account
// 2. Add an email service (Gmail recommended):
//    - Go to Email Services > Add Service
//    - Choose Gmail and authorize your account
//    - Note the Service ID
// 3. Create an email template:
//    - Go to Email Templates > Create New Template
//    - Use these variables in your template:
//      {{user_email}} - The email address that signed up
//      {{user_name}} - Username extracted from email
//      {{timestamp}} - When they signed up
//      {{message}} - Additional context message
//    - Example template:
//      Subject: New CORE-SE Email Signup
//      Body: 
//        New email signup for CORE-SE!
//        
//        Email: {{user_email}}
//        Name: {{user_name}}
//        Time: {{timestamp}}
//        
//        {{message}}
// 4. Get your Public Key:
//    - Go to Account > General
//    - Copy your Public Key
// 5. Replace the values above with your actual IDs
//
// Note: The current values are placeholders and need to be replaced with your actual EmailJS credentials
