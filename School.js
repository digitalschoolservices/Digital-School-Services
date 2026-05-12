const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
    schoolName: { type: String, required: true },
    schoolCity: { type: String, required: true },
    adminEmail: { type: String, required: true, unique: true },
    adminPassword: { type: String, required: true },
    
    // આ નવી લાઈન આપણે ઉમેરી જેથી 6 આંકડાની ID સેવ કરી શકાય 👇
    schoolId: { type: String, unique: true, required: true }, 

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('School', SchoolSchema);