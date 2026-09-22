const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressErr = require("./utils/ExpressErr.js");
const { listingSchema, reviewSchema } = require("./schema.js");

// App configuration
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// Global locals for templates
app.use((req, res, next) => {
    res.locals.currPath = req.path;
    next();
});

// Database connection
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
    await mongoose.connect(MONGO_URL);
}

main()
    .then(() => {
        console.log("Connected to MongoDB successfully");
    })
    .catch((err) => {
        console.error("MongoDB Connection Error:", err.message);
    });

// Request Validation Middlewares
const validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body);
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(", ");
        throw new ExpressErr(400, errMsg);
    } else {
        next();
    }
};

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(", ");
        throw new ExpressErr(400, errMsg);
    } else {
        next();
    }
};

// ==========================================
// ROUTES
// ==========================================

// 1. Home Page Route
app.get(
    "/",
    wrapAsync(async (req, res) => {
        const featuredListings = await Listing.find({}).limit(8);
        res.render("home.ejs", { featuredListings });
    })
);

// 2. Listings Index Route (Supports Search & Category Filter)
app.get(
    "/listings",
    wrapAsync(async (req, res) => {
        const { category, search } = req.query;
        let filter = {};

        if (category && category !== "All") {
            filter.category = category;
        }

        if (search && search.trim() !== "") {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { title: regex },
                { location: regex },
                { country: regex },
                { description: regex }
            ];
        }

        const allListings = await Listing.find(filter);
        res.render("listings/index.ejs", {
            allListings,
            selectedCategory: category || "All",
            searchQuery: search || ""
        });
    })
);

// Backward compatibility alias for /listing
app.get("/listing", (req, res) => {
    const queryString = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
    res.redirect(`/listings${queryString}`);
});

// 3. New Listing Form Route
app.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
});

// 4. Show Single Listing Route
app.get(
    "/listings/:id",
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const listing = await Listing.findById(id).populate("reviews");
        if (!listing) {
            throw new ExpressErr(404, "Listing you requested does not exist!");
        }
        res.render("listings/show.ejs", { listing });
    })
);

// 5. Create Listing Route
app.post(
    "/listings",
    validateListing,
    wrapAsync(async (req, res) => {
        const newListingData = { ...req.body.listing };

        // Sanitize image input
        if (!newListingData.image || (typeof newListingData.image === "string" && !newListingData.image.trim())) {
            newListingData.image = {
                url: "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800",
                filename: "listingimage"
            };
        } else if (typeof newListingData.image === "string") {
            newListingData.image = {
                url: newListingData.image.trim(),
                filename: "listingimage"
            };
        } else if (typeof newListingData.image === "object" && !newListingData.image.url) {
            newListingData.image.url = "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800";
        }

        const newListing = new Listing(newListingData);
        await newListing.save();
        res.redirect(`/listings/${newListing._id}`);
    })
);

// 6. Edit Listing Form Route
app.get(
    "/listings/:id/edit",
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const listing = await Listing.findById(id);
        if (!listing) {
            throw new ExpressErr(404, "Listing you requested to edit does not exist!");
        }
        res.render("listings/edit.ejs", { listing });
    })
);

// Backward compatibility alias for edit
app.get("/listing/:id/edit", (req, res) => {
    res.redirect(`/listings/${req.params.id}/edit`);
});

// 7. Update Listing Route
app.put(
    "/listings/:id",
    validateListing,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const updateData = { ...req.body.listing };

        // Handle image structure
        if (typeof updateData.image === "string") {
            updateData.image = {
                url: updateData.image.trim() || "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800",
                filename: "listingimage"
            };
        } else if (typeof updateData.image === "object" && (!updateData.image.url || !updateData.image.url.trim())) {
            delete updateData.image;
        }

        const updatedListing = await Listing.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updatedListing) {
            throw new ExpressErr(404, "Listing not found to update!");
        }
        res.redirect(`/listings/${id}`);
    })
);

// 8. Delete Listing Route
app.delete(
    "/listings/:id",
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const deletedListing = await Listing.findByIdAndDelete(id);
        if (!deletedListing) {
            throw new ExpressErr(404, "Listing not found to delete!");
        }
        res.redirect("/listings");
    })
);

// 9. Review Post Route
app.post(
    "/listings/:id/reviews",
    validateReview,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const listing = await Listing.findById(id);
        if (!listing) {
            throw new ExpressErr(404, "Listing not found to add review!");
        }

        const newReview = new Review(req.body.review);
        listing.reviews.push(newReview);

        await newReview.save();
        await listing.save();
        res.redirect(`/listings/${id}`);
    })
);

// 10. Delete Review Route
app.delete(
    "/listings/:id/reviews/:reviewId",
    wrapAsync(async (req, res) => {
        const { id, reviewId } = req.params;
        await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
        await Review.findByIdAndDelete(reviewId);
        res.redirect(`/listings/${id}`);
    })
);

// 11. Informational Static Pages
app.get("/about", (req, res) => {
    res.render("pages/about.ejs");
});

app.get("/privacy", (req, res) => {
    res.render("pages/privacy.ejs");
});

app.get("/terms", (req, res) => {
    res.render("pages/terms.ejs");
});

// 12. Catch-all 404 Route Handler (Express v5 compatible)
app.use((req, res, next) => {
    next(new ExpressErr(404, "Page Not Found! The page you are looking for does not exist."));
});

// 13. Global Error Handling Middleware
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).render("error.ejs", { message, statusCode });
});

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Wanderlust server is running on http://localhost:${PORT}`);
});
