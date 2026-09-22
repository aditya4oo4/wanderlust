const http = require("http");

function fetchUrl(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(`http://localhost:8080${path}`, options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        req.on("error", reject);
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function runTests() {
    console.log("Starting Wanderlust Automated Test Suite...\n");
    let passed = 0;
    let failed = 0;

    const assert = (condition, testName, details = "") => {
        if (condition) {
            console.log(`✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${testName} - ${details}`);
            failed++;
        }
    };

    try {
        // 1. Test Homepage
        const homeRes = await fetchUrl("/");
        assert(homeRes.status === 200, "GET / (Homepage) returns 200");
        assert(homeRes.body.includes("Wanderlust"), "Homepage contains Wanderlust branding");
        assert(homeRes.body.includes("Find Your Next"), "Homepage contains Hero Section");
        assert(homeRes.body.includes("Explore By Category"), "Homepage contains Category section");

        // 2. Test Listings Index
        const listingsRes = await fetchUrl("/listings");
        assert(listingsRes.status === 200, "GET /listings returns 200");
        assert(listingsRes.body.includes("Display total after taxes"), "Listings index has Tax toggle switch");
        assert(listingsRes.body.includes("listing-card"), "Listings index renders listing cards");

        // 3. Test Backward Compatibility Redirect /listing -> /listings
        const legacyRes = await fetchUrl("/listing", { method: "GET" });
        assert(legacyRes.status === 302 && legacyRes.headers.location.startsWith("/listings"), "GET /listing redirects (302) to /listings");

        // 4. Test Category Filter
        const catRes = await fetchUrl("/listings?category=Beachfront");
        assert(catRes.status === 200, "GET /listings?category=Beachfront returns 200");

        // 5. Test Search Query
        const searchRes = await fetchUrl("/listings?search=Malibu");
        assert(searchRes.status === 200, "GET /listings?search=Malibu returns 200");
        assert(searchRes.body.includes("Malibu"), "Search results contain matching destination");

        // 6. Test New Listing Form Route
        const newFormRes = await fetchUrl("/listings/new");
        assert(newFormRes.status === 200, "GET /listings/new returns 200");
        assert(newFormRes.body.includes("Create a New Listing"), "New listing form has proper header");

        // 7. Test Create Listing (POST /listings)
        const postData = "listing%5Btitle%5D=Automated+Test+Villa&listing%5Bdescription%5D=A+beautiful+automated+test+stay&listing%5Bprice%5D=4500&listing%5Blocation%5D=Goa&listing%5Bcountry%5D=India&listing%5Bcategory%5D=Beachfront&listing%5Bimage%5D%5Burl%5D=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1542314831-068cd1dbfeeb%3Fw%3D800";
        const createRes = await fetchUrl("/listings", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(postData)
            },
            body: postData
        });
        assert(createRes.status === 302, "POST /listings creates listing and returns 302 redirect");
        const newListingUrl = createRes.headers.location;
        console.log(`   Redirected to new listing: ${newListingUrl}`);

        // 8. Test Show Single Listing
        const showRes = await fetchUrl(newListingUrl);
        assert(showRes.status === 200, `GET ${newListingUrl} returns 200`);
        assert(showRes.body.includes("Automated Test Villa"), "Show page contains newly created listing title");
        assert(showRes.body.includes("Leave a Review"), "Show page contains Review form");
        assert(showRes.body.includes("What this place offers"), "Show page contains amenities section");

        // 9. Test Add Review (POST /listings/:id/reviews)
        const reviewData = "review%5Brating%5D=5&review%5Bauthor%5D=Test+Traveler&review%5Bcomment%5D=Exceptional+experience+and+immaculate+cleanliness!";
        const reviewRes = await fetchUrl(`${newListingUrl}/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(reviewData)
            },
            body: reviewData
        });
        assert(reviewRes.status === 302, "POST review returns 302 redirect");

        // Verify review is visible
        const showAfterReviewRes = await fetchUrl(newListingUrl);
        assert(showAfterReviewRes.body.includes("Test Traveler"), "Show page displays newly created review author");
        assert(showAfterReviewRes.body.includes("Exceptional experience"), "Show page displays review comment");

        // 10. Test Edit Form (GET /listings/:id/edit)
        const editFormRes = await fetchUrl(`${newListingUrl}/edit`);
        assert(editFormRes.status === 200, `GET ${newListingUrl}/edit returns 200`);
        assert(editFormRes.body.includes("Automated Test Villa"), "Edit form contains prepopulated title");

        // 11. Test Update Listing (PUT /listings/:id)
        const updateData = "listing%5Btitle%5D=Automated+Test+Villa+Updated&listing%5Bdescription%5D=Updated+description&listing%5Bprice%5D=4900&listing%5Blocation%5D=Goa&listing%5Bcountry%5D=India&listing%5Bcategory%5D=Beachfront";
        const updateRes = await fetchUrl(`${newListingUrl}?_method=PUT`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(updateData)
            },
            body: updateData
        });
        assert(updateRes.status === 302, "PUT update returns 302 redirect");
        const showUpdatedRes = await fetchUrl(newListingUrl);
        assert(showUpdatedRes.body.includes("Automated Test Villa Updated"), "Show page reflects updated title");
        assert(showUpdatedRes.body.includes("4,900"), "Show page reflects updated price");

        // 12. Test Delete Listing (DELETE /listings/:id)
        const deleteRes = await fetchUrl(`${newListingUrl}?_method=DELETE`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        assert(deleteRes.status === 302, "DELETE listing returns 302 redirect to /listings");

        // 13. Test Static Pages
        const aboutRes = await fetchUrl("/about");
        assert(aboutRes.status === 200, "GET /about returns 200");
        assert(aboutRes.body.includes("About Wanderlust"), "About page content verified");

        const privacyRes = await fetchUrl("/privacy");
        assert(privacyRes.status === 200, "GET /privacy returns 200");
        assert(privacyRes.body.includes("Privacy Policy"), "Privacy page content verified");

        const termsRes = await fetchUrl("/terms");
        assert(termsRes.status === 200, "GET /terms returns 200");
        assert(termsRes.body.includes("Terms of Service"), "Terms page content verified");

        // 14. Test 404 Error Handler
        const notFoundRes = await fetchUrl("/random-non-existent-route");
        assert(notFoundRes.status === 404, "GET /invalid-route returns 404 status");
        assert(notFoundRes.body.includes("Page Not Found"), "404 page rendered custom error UI");

        console.log(`\n========================================`);
        console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
        console.log(`========================================\n`);

        if (failed > 0) {
            process.exit(1);
        }
    } catch (err) {
        console.error("Test execution error:", err);
        process.exit(1);
    }
}

runTests();
