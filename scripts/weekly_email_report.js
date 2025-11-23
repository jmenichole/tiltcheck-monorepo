const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'Outlook365',
    auth: {
        user: 'jmenichole007@outlook.com',
        pass: process.env.EMAIL_PASSWORD // Use environment variable for security
    }
});

// Path to the sign-up emails JSON file
const emailsFilePath = path.join(__dirname, '../data/signups.json');

// Function to generate the weekly report
function generateWeeklyReport() {
    if (!fs.existsSync(emailsFilePath)) {
        console.error('Sign-up emails file not found.');
        return;
    }

    const emailsData = JSON.parse(fs.readFileSync(emailsFilePath, 'utf-8'));
    const totalSignUps = emailsData.length;

    const emailContent = `
        <h1>Weekly Sign-Up Report</h1>
        <p>Total Sign-Ups: ${totalSignUps}</p>
    `;

    const mailOptions = {
        from: 'jmenichole007@outlook.com',
        to: 'jmenichole007@outlook.com',
        subject: 'Weekly Sign-Up Report',
        html: emailContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Weekly report sent:', info.response);
        }
    });
}

// Schedule the report to run weekly
const schedule = require('node-schedule');
schedule.scheduleJob('0 9 * * 1', generateWeeklyReport); // Every Monday at 9 AM

console.log('Weekly email report scheduler initialized.');