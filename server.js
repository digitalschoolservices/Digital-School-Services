const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path'); // આ લાઈન ફાઈલ પાથ સેટ કરવા માટે જરૂરી છે
require('dotenv').config();

const app = express();

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        "font-src": ["'self'", "https://cdnjs.cloudflare.com"],
      },
    },
  })
);

app.use(cors());
app.use(express.json());

// --- મુખ્ય ફેરફાર અહીં છે ---
// આ લાઈન સર્વરને કહેશે કે બધી HTML, CSS અને ઈમેજ 'public' ફોલ્ડરમાં છે
app.use(express.static(path.join(__dirname, 'public'))); 

// ડેટાબેઝ કનેક્શન
const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI)
    .then(() => console.log("✅ ડિજિટલ સ્કૂલ ડેટાબેઝ કનેક્ટ થયો છે!"))
    .catch(err => console.error("❌ ડેટાબેઝ એરર:", err));

const PORT = process.env.PORT || 5000;

// મોડલ ઈમ્પોર્ટ
const School = require('./models/School');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- ROUTES ---

// ૧. હોમ પેજ (ડિજિટલ સ્કૂલ સર્વિસ લેન્ડિંગ પેજ)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ૨. સ્કૂલ રજીસ્ટ્રેશન API
app.post('/api/register-school', async (req, res) => {
    try {
        const { schoolName, schoolCity, adminEmail, adminPassword } = req.body;
        const existingSchool = await School.findOne({ adminEmail });
        if (existingSchool) return res.status(400).json({ message: "ઈમેલ વપરાયેલ છે!" });

        let isUnique = false;
        let newSchoolId;
        while (!isUnique) {
            newSchoolId = Math.floor(100000 + Math.random() * 900000).toString();
            const alreadyExists = await School.findOne({ schoolId: newSchoolId });
            if (!alreadyExists) isUnique = true;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const newSchool = new School({
            schoolName, schoolCity, adminEmail, 
            adminPassword: hashedPassword, schoolId: newSchoolId
        });

        await newSchool.save();
        res.status(201).json({ message: "સફળ!", schoolId: newSchoolId });
    } catch (error) {
        res.status(500).json({ message: "સર્વર એરર" });
    }
});

// ૩. સ્કૂલ લોગિન API
app.post('/api/login-school', async (req, res) => {
    try {
        const { adminEmail, adminPassword } = req.body;
        const school = await School.findOne({ adminEmail });
        if (!school) return res.status(400).json({ message: "ખોટો ઈમેલ!" });

        const isMatch = await bcrypt.compare(adminPassword, school.adminPassword);
        if (!isMatch) return res.status(400).json({ message: "ખોટો પાસવર્ડ!" });

        const token = jwt.sign(
            { schoolId: school._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.status(200).json({ token, schoolName: school.schoolName });
    } catch (error) {
        res.status(500).json({ message: "સર્વર એરર" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 સર્વર http://localhost:${PORT} પર લાઈવ છે`);
});
