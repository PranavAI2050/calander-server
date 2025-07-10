require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
// app.use(cors());
app.use(cors({
  origin: "*",
}));

app.use(express.json());

const serviceAccountPath = path.join(__dirname, "config.json");
const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));


const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

// ✅ Email sending function
const sendEmail = async ({ to, subject, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Test Drive Booking" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
};

app.get("/", (req, res) => {
  res.send("✅ Node.js server is up and running!");
});

app.post("/create-event", async (req, res) => {
  const { date, time, car, email } = req.body;

  try {
    const start = new Date(`${date}T${time}:00+05:30`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const calendar = google.calendar({ version: "v3", auth });

    const event = {
      summary: `Test Drive: ${car}`,
      description: `Test drive booking for ${car}`,
      start: {
        dateTime: start.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: "Asia/Kolkata",
      },
    };

    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
    });

    // ✅ Send confirmation email
    if (email) {
      await sendEmail({
        to: email,
        subject: `Your Test Drive for ${car} is Confirmed!`,
        text: `Hi,\n\nYour test drive for ${car} is booked on ${date} at ${time}.\n\nLocation: Showroom\n\nThanks!`,
      });
    }

    res.status(200).json({ message: "✅ Event created & email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Could not create event" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
