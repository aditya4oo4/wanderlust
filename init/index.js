const mongoose = require("mongoose");
const initializeData = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";

main()
    .then(() => {
        console.log("Connected to MongoDB for seeding");
        return initDb();
    })
    .catch((err) => {
        console.error("DB connection error:", err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

const getCategoryForListing = (listing) => {
    const text = (listing.title + " " + listing.description).toLowerCase();
    if (text.includes("beach") || text.includes("ocean") || text.includes("sea") || text.includes("coastal")) return "Beachfront";
    if (text.includes("mountain") || text.includes("ski") || text.includes("aspen") || text.includes("alps")) return "Mountains";
    if (text.includes("city") || text.includes("loft") || text.includes("downtown") || text.includes("urban") || text.includes("york") || text.includes("london") || text.includes("tokyo")) return "Iconic Cities";
    if (text.includes("castle") || text.includes("villa") || text.includes("historic") || text.includes("palace")) return "Castles";
    if (text.includes("pool") || text.includes("swim") || text.includes("resort")) return "Amazing Pools";
    if (text.includes("camp") || text.includes("tent") || text.includes("cabin") || text.includes("treehouse") || text.includes("forest")) return "Camping";
    if (text.includes("farm") || text.includes("countryside") || text.includes("cottage")) return "Farms";
    if (text.includes("snow") || text.includes("arctic") || text.includes("ice") || text.includes("chalet")) return "Arctic";
    if (text.includes("luxury") || text.includes("penthouse") || text.includes("mansion") || text.includes("private")) return "Luxury";
    return "Trending";
};

const initDb = async () => {
    await Listing.deleteMany({});
    const enrichedData = initializeData.data.map((obj) => ({
        ...obj,
        category: obj.category || getCategoryForListing(obj)
    }));
    await Listing.insertMany(enrichedData);
    console.log(`Successfully initialized DB with ${enrichedData.length} Wanderlust listings!`);
    await mongoose.connection.close();
};