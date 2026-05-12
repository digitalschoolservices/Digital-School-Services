const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'"], // આ લાઈન ઈનલાઈન સ્ક્રિપ્ટને ચલાવવા દેશે
      },
    },
  })
);
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // આ લાઈન બધી HTML ફાઈલોને સર્વર સાથે જોડશે

// ડેટાબેઝ કનેક્શન (સુરક્ષિત રીતે .env માંથી લેશે)
const mongoURI = process.env.MONGO_URI; 

mongoose.connect(mongoURI)
    .then(() => console.log("✅ ડેટાબેઝ સાથે જોડાણ સફળ!"))
    .catch(err => console.error("❌ ડેટાબેઝ કનેક્શનમાં ભૂલ:", err));

const PORT = process.env.PORT || 5000;

const bcrypt = require('bcryptjs');
const School = require('./models/School');

// નવી સ્કૂલ રજીસ્ટર કરવાની API (સુરક્ષિત રીતે)
app.post('/api/register-school', async (req, res) => {
    try {
        const { schoolName, schoolCity, adminEmail, adminPassword } = req.body;

        // ૧. ઈમેલ ચેક કરો
        const existingSchool = await School.findOne({ adminEmail });
        if (existingSchool) {
            return res.status(400).json({ message: "આ ઈમેલ પહેલેથી વપરાયેલ છે!" });
        }

        // ૨. 6-આંકડાનો અનોખો (Unique) રેન્ડમ આઈડી બનાવવાનું લોજિક
        let isUnique = false;
        let newSchoolId;

        while (!isUnique) {
            // ૧૦૦૦૦૦ થી ૯૯૯૯૯૯ વચ્ચેનો કોઈ પણ નંબર
            newSchoolId = Math.floor(100000 + Math.random() * 900000).toString();
            
            // ડેટાબેઝમાં ચેક કરો કે આ નંબર કોઈને અપાઈ તો નથી ગયો ને?
            const alreadyExists = await School.findOne({ schoolId: newSchoolId });
            if (!alreadyExists) {
                isUnique = true;
            }
        }

        // ૩. પાસવર્ડ હેશિંગ
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // ૪. સેવ કરો
        const newSchool = new School({
            schoolName,
            schoolCity,
            adminEmail,
            adminPassword: hashedPassword,
            schoolId: newSchoolId
        });

        await newSchool.save();

        res.status(201).json({ 
            message: `રજીસ્ટ્રેશન સફળ! તમારી યુનિક સ્કૂલ આઈડી: ${newSchoolId}`,
            schoolId: newSchoolId 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "સર્વરમાં કોઈ ભૂલ આવી છે." });
    }
});

const jwt = require('jsonwebtoken');

// --- લોગિન API ---
app.post('/api/login-school', async (req, res) => {
    try {
        const { adminEmail, adminPassword } = req.body;

        // ૧. તપાસો કે ઈમેલ અસ્તિત્વમાં છે કે નહીં
        const school = await School.findOne({ adminEmail });
        if (!school) {
            return res.status(400).json({ message: "ઈમેલ ખોટો છે અથવા સ્કૂલ રજીસ્ટર નથી!" });
        }

        // ૨. પાસવર્ડ ચેક કરો (Bcrypt દ્વારા Hash સરખાવો)
        const isMatch = await bcrypt.compare(adminPassword, school.adminPassword);
        if (!isMatch) {
            return res.status(400).json({ message: "પાસવર્ડ ખોટો છે!" });
        }

        // ૩. જો બધું સાચું હોય, તો JWT Token બનાવો
        const token = jwt.sign(
            { schoolId: school._id, email: school.adminEmail },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // ૧ કલાક પછી ટોકન એક્સપાયર થશે
        );

        res.status(200).json({
            message: "લોગિન સફળ!",
            token: token,
            schoolName: school.schoolName
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "સર્વરમાં ભૂલ આવી છે." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 સર્વર http://localhost:${PORT} પર ચાલુ છે`);
});