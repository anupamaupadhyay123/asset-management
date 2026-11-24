// ===== Action dropdown helper =====
function wrapActionMenu(buttonsHTML) {
    // Pull the View button out of the menu and keep it hidden (row click uses it)
    const viewRegex = /<button[^>]*data-action="view"[^>]*>[\s\S]*?<\/button>/;
    const viewMatch = buttonsHTML.match(viewRegex);
    const hiddenViewBtn = viewMatch
        ? viewMatch[0].replace("<button", '<button style="display:none" tabindex="-1"')
        : "";
    const menuButtons = buttonsHTML.replace(viewRegex, "");

    return `
        <div class="action-dropdown">
            <button type="button" class="action-toggle-btn">&#8942;</button>
            <div class="action-menu">${menuButtons}</div>
            ${hiddenViewBtn}
        </div>`;
}

function closeAllActionMenus() {
    document.querySelectorAll(".action-menu.open").forEach(function (m) {
        m.classList.remove("open");
    });
}

document.addEventListener("click", function (e) {
    const toggle = e.target.closest(".action-toggle-btn");

    if (!toggle) {
        closeAllActionMenus();
        return;
    }

    const menu = toggle.nextElementSibling;
    const wasOpen = menu.classList.contains("open");
    closeAllActionMenus();

    if (!wasOpen) {
        menu.classList.add("open");
        const rect = toggle.getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        let top = rect.bottom + 4;
        if (top + menuHeight > window.innerHeight - 8) {
            top = rect.top - menuHeight - 4;
        }
        menu.style.top = top + "px";
        menu.style.left = Math.max(8, rect.right - menu.offsetWidth) + "px";
    }
});

window.addEventListener("scroll", closeAllActionMenus, true);
window.addEventListener("resize", closeAllActionMenus);


// Record deliberate user actions only; normal data-loading GET requests are not audited.
async function recordAuditEvent(action, assetId = "", description = "") {
    try {
        await fetch("/api/audit/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, assetId, description })
        });
    } catch (error) {
        console.warn("Could not record user activity:", error.message);
    }
}

// ============================================================
// ROF ASSET MANAGEMENT SYSTEM
// ASSETS PAGE - FINAL FRONTEND
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    if (window.ROFAccess?.ready) await window.ROFAccess.ready;
    const can = permission => window.ROFAccess?.has?.(permission) === true;

    // ========================================================
    // ELEMENTS
    // ========================================================

    const tableSearch =
        document.getElementById("tableSearch");

    const statusFilter =
        document.getElementById("statusFilter");

    const typeFilter =
        document.getElementById("typeFilter");

    const locationFilter =
        document.getElementById("locationFilter");

    const addAssetBtn =
        document.getElementById("addAssetBtn");

    const tbody =
        document.querySelector("table tbody");

    const miniCardValues =
        document.querySelectorAll(
            ".asset-dashboard-stats .dashboard-stat-card strong"
        );

    const assetCountText =
        document.querySelector(
            ".table-header > div > span"
        );


    // ========================================================
    // DATA
    // ========================================================

    let allAssets = [];


    // ========================================================
    // UTILITY
    // ========================================================

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return value;
        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }


    // ========================================================
    // LOAD CURRENT ASSIGNMENT DETAILS FOR ASSIGNED ASSETS
    // ========================================================


    // ========================================================
    // LOAD ASSETS FROM DATABASE
    // ========================================================

    async function loadAssets() {

        try {

            const response =
                await fetch("/api/assets");

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Unable to load assets."
                );
            }

            allAssets =
                (
                    Array.isArray(data.assets)
                        ? data.assets
                        : []
                ).sort((a, b) => {

                    const na =
                        parseInt(
                            String(
                                a.asset_id || ""
                            ).match(/(\d+)$/)?.[1] || "0",
                            10
                        );

                    const nb =
                        parseInt(
                            String(
                                b.asset_id || ""
                            ).match(/(\d+)$/)?.[1] || "0",
                            10
                        );

                    return (
                        na - nb ||
                        String(
                            a.asset_id || ""
                        ).localeCompare(
                            String(
                                b.asset_id || ""
                            )
                        )
                    );

                });

            updateCounters(allAssets);

            applyFilters();

        }

        catch (error) {

            console.error(
                "Load assets error:",
                error
            );

            if (tbody) {

                tbody.innerHTML = `

                    <tr>

                        <td
                            colspan="9"
                            style="
                                text-align:center;
                                padding:40px;
                                color:#dc2626;
                            "
                        >

                            Unable to load assets.

                        </td>

                    </tr>

                `;

            }

        }

    }


    // ========================================================
    // UPDATE COUNTERS
    // ========================================================

    function updateCounters(assets) {

        const total =
            assets.length;

        const getStatus = asset => {
            const status = String(asset?.status || "Available")
                .trim()
                .toLowerCase();

            if (["assigned", "active", "issued"].includes(status)) {
                return "Assigned";
            }
            if (["under repair", "under_repair", "repair", "repairing"].includes(status)) {
                return "Under Repair";
            }
            if (["retired", "retire"].includes(status)) {
                return "Retired";
            }
            return "Available";
        };

        const available =
            assets.filter(asset => getStatus(asset) === "Available").length;

        const assigned =
            assets.filter(asset => getStatus(asset) === "Assigned").length;

        const repair =
            assets.filter(asset => getStatus(asset) === "Under Repair").length;

        const retired =
            assets.filter(asset => getStatus(asset) === "Retired").length;


        if (miniCardValues[0]) {

            miniCardValues[0]
                .textContent =
                total;

        }


        if (miniCardValues[1]) {

            miniCardValues[1]
                .textContent =
                available;

        }


        if (miniCardValues[2]) {

            miniCardValues[2]
                .textContent =
                assigned;

        }


        if (miniCardValues[3]) {

            miniCardValues[3]
                .textContent =
                repair;

        }

        if (miniCardValues[4]) {

            miniCardValues[4]
                .textContent =
                retired;

        }

    }


    // ========================================================
    // RENDER ASSETS
    // ========================================================

    function renderAssets(assets) {

        if (!tbody) {
            return;
        }

        tbody.innerHTML = "";


        if (!assets.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        style="
                            text-align:center;
                            padding:45px;
                            color:#6b7280;
                        "
                    >

                        No assets found.

                    </td>

                </tr>

            `;


            if (assetCountText) {

                assetCountText.textContent =
                    "0 assets found";

            }

            return;
        }


        if (assetCountText) {

            assetCountText.textContent =
                `${assets.length} ${assets.length === 1
                    ? "asset"
                    : "assets"
                } found`;

        }


        assets.forEach(asset => {

            const normalizedStatus = String(asset.status || "Available")
                .trim()
                .toLowerCase()
                .replace(/_/g, " ");
            const displayStatus =
                ["assigned", "active", "issued"].includes(normalizedStatus) ? "Assigned" :
                    ["under repair", "repair", "repairing"].includes(normalizedStatus) ? "Under Repair" :
                        ["retired", "retire"].includes(normalizedStatus) ? "Retired" :
                            "Available";

            const row =
                document.createElement("tr");


            let badgeClass =
                "available";


            if (
                displayStatus === "Assigned"
            ) {

                badgeClass =
                    "assigned";

            }

            else if (
                displayStatus === "Under Repair"
            ) {

                badgeClass =
                    "repair";

            }

            else if (
                displayStatus === "Retired"
            ) {

                badgeClass =
                    "retired";

            }


            const assignedTo =
                asset.assigned_to || "—";


            let actionHTML = `

                <button
                    class="view-btn"
                    data-action="view"
                    data-asset-id="${escapeHTML(
                asset.asset_id
            )}"
                >
                    View
                </button>

            `;
            if (can("asset_view")) actionHTML += `<button class="view-btn" data-action="photos" data-asset-id="${escapeHTML(asset.asset_id)}">Photos</button>`;


            // =================================================
            // AVAILABLE ASSET
            // =================================================

            if (displayStatus === "Available") {
                if (can("asset_assign")) actionHTML += `
                    <button class="assign-btn" data-action="assign" data-asset-id="${escapeHTML(asset.asset_id)}">Assign</button>`;
                if (can("asset_repair")) actionHTML += `
                    <button class="repair-btn" data-action="repair" data-asset-id="${escapeHTML(asset.asset_id)}">Repair</button>`;
                if (can("asset_retire")) actionHTML += `
                    <button class="retire-btn" data-action="retire" data-asset-id="${escapeHTML(asset.asset_id)}">Retire</button>`;
            }


            // =================================================
            // ASSIGNED ASSET
            // =================================================

            if (displayStatus === "Assigned") {
                if (can("asset_return")) actionHTML += `
                    <button class="return-btn" data-action="return" data-asset-id="${escapeHTML(asset.asset_id)}">Return</button>`;
                if (can("asset_view")) actionHTML += `
                    <button class="print-btn" data-action="print" data-asset-id="${escapeHTML(asset.asset_id)}">🖨 Print</button>`;
            }

            if (displayStatus === "Under Repair" && can("asset_repair")) {
                actionHTML += `
                    <button class="repair-complete-btn" data-action="repair-complete" data-asset-id="${escapeHTML(asset.asset_id)}">Back</button>`;
            }


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(
                asset.asset_id
            )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                asset.asset_type
            )}
                </td>

                <td>
                    ${escapeHTML(
                asset.model || "—"
            )}
                </td>

                <td>
                    ${escapeHTML(
                asset.serial_number
            )}
                </td>

                <td>
                    ${escapeHTML(
                asset.location
            )}
                </td>

                <td>
                    ${escapeHTML(
                assignedTo
            )}
                </td>

                <td>
                    <span
                        class="badge ${badgeClass}"
                    >
                        ${escapeHTML(displayStatus)}
                    </span>
                </td>

                <td>
                    ${wrapActionMenu(actionHTML)}
                </td>

            `;


            tbody.appendChild(row);

        });

    }


    // ========================================================
    // FILTERS
    // ========================================================

    function applyFilters() {

        const searchValue =
            tableSearch
                ? tableSearch.value
                    .toLowerCase()
                    .trim()
                : "";

        const statusValue =
            statusFilter
                ? statusFilter.value
                : "";

        const typeValue =
            typeFilter
                ? typeFilter.value
                : "";

        const locationValue =
            locationFilter
                ? locationFilter.value
                : "";


        const filtered =
            allAssets.filter(asset => {

                const searchableText = [

                    asset.asset_id,
                    asset.asset_type,
                    asset.model,
                    asset.serial_number,
                    asset.location,
                    asset.assigned_to,
                    asset.status

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const searchMatch =
                    !searchValue ||
                    searchableText.includes(
                        searchValue
                    );


                const statusMatch =
                    !statusValue ||
                    asset.status ===
                    statusValue;


                const typeMatch =
                    !typeValue ||
                    asset.asset_type ===
                    typeValue;


                const locationMatch =
                    !locationValue ||
                    asset.location ===
                    locationValue;


                return (
                    searchMatch &&
                    statusMatch &&
                    typeMatch &&
                    locationMatch
                );

            });


        renderAssets(filtered);

    }


    if (tableSearch) {

        tableSearch.addEventListener(
            "input",
            applyFilters
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (typeFilter) {

        typeFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (locationFilter) {

        locationFilter.addEventListener(
            "change",
            applyFilters
        );

    }

    // ========================================================
    // CREATE ADD ASSET MODAL
    // ========================================================

    function createAddAssetModal() {

        if (
            document.getElementById(
                "dynamicAddAssetModal"
            )
        ) {
            return;
        }


        const modal =
            document.createElement("div");


        modal.id =
            "dynamicAddAssetModal";


        modal.className =
            "modal-overlay";


        modal.innerHTML = `

            <div
                class="modal-box"
                style="
                    max-width:900px;
                    max-height:90vh;
                    overflow-y:auto;
                "
            >

                <div class="modal-header">

                    <div>

                        <h2>
                            Add New Asset
                        </h2>

                        <p>
                            Register a new company asset
                        </p>

                    </div>


                    <button
                        type="button"
                        id="dynamicCloseAddAsset"
                        class="modal-close"
                    >
                        ×
                    </button>

                </div>


                <form id="dynamicAssetForm">

                    <div class="details-grid">

                        <!-- ASSET ID -->

                        <div class="detail-item">

                            <label>
                                Asset ID
                            </label>

                            <input
                                id="dynamicAssetId"
                                type="text"
                                readonly
                                style="width:100%;"
                            >

                        </div>


                        <!-- ASSET TYPE -->

                        <div class="detail-item">

                            <label>
                                Asset Type *
                            </label>

                            <select
                                id="dynamicAssetType"
                                required
                                style="width:100%;"
                            >

                                <option value="">
                                    Select Asset Type
                                </option>

                                <option value="Laptop">
                                    Laptop
                                </option>

                                <option value="Desktop">
                                    Desktop
                                </option>

                                <option value="Monitor">
                                    Monitor
                                </option>

                                <option value="Printer">
                                    Printer
                                </option>

                                <option value="UPS">
                                    UPS
                                </option>

                                <option value="Server">
                                    Server
                                </option>

                                <option value="Other">
                                    Other
                                </option>

                            </select>

                        </div>


                        <!-- BRAND -->

                        <div class="detail-item">

                            <label>
                                Brand *
                            </label>

                            <input
                                id="dynamicBrand"
                                type="text"
                                required
                                style="width:100%;"
                            >

                        </div>


                        <!-- MODEL -->

                        <div class="detail-item">

                            <label>
                                Model
                            </label>

                            <input
                                id="dynamicModel"
                                type="text"
                                style="width:100%;"
                            >

                        </div>


                        <!-- SERIAL -->

                        <div class="detail-item">

                            <label>
                                Serial Number *
                            </label>

                            <input
                                id="dynamicSerialNumber"
                                type="text"
                                required
                                style="width:100%;"
                            >

                        </div>


                        <!-- CONDITION -->

                        <div class="detail-item">

                            <label>
                                Condition *
                            </label>

                            <select
                                id="dynamicCondition"
                                required
                                style="width:100%;"
                            >

                                <option value="">
                                    Select Condition
                                </option>

                                <option value="New">
                                    New
                                </option>

                                <option value="Good">
                                    Good
                                </option>

                                <option value="Fair">
                                    Fair
                                </option>

                                <option value="Poor">
                                    Poor
                                </option>

                            </select>

                        </div>


                        <!-- PURCHASE DATE -->

                        <div class="detail-item">

                            <label>
                                Purchase Date
                            </label>

                            <input
                                id="dynamicPurchaseDate"
                                type="date"
                                style="width:100%;"
                            >

                        </div>


                        <!-- PURCHASE COST -->

                        <div class="detail-item">

                            <label>
                                Purchase Cost
                            </label>

                            <input
                                id="dynamicPurchaseCost"
                                type="number"
                                min="0"
                                step="0.01"
                                style="width:100%;"
                            >

                        </div>


                        <!-- VENDOR -->

                        <div class="detail-item">

                            <label>
                                Vendor
                            </label>

                            <input
                                id="dynamicVendor"
                                type="text"
                                style="width:100%;"
                            >

                        </div>


                        <!-- WARRANTY -->

                        <div class="detail-item">

                            <label>
                                Warranty Expiry
                            </label>

                            <input
                                id="dynamicWarrantyExpiry"
                                type="date"
                                style="width:100%;"
                            >

                        </div>


                        <!-- DEPARTMENT -->

                        <div class="detail-item">

                            <label>
                                Department
                            </label>

                            <input
                                id="dynamicDepartment"
                                type="text"
                                value="IT"
                                style="width:100%;"
                            >

                        </div>


                        <!-- LOCATION -->

                        <div class="detail-item">

                            <label>
                                Location *
                            </label>

                            <select
                                id="dynamicLocation"
                                required
                                style="width:100%;"
                            >

                                <option value="">
                                    Select Location
                                </option>

                                <option value="ROF Alante">
                                    ROF Alante
                                </option>

                                <option value="ROF Murthal">
                                    ROF Murthal
                                </option>

                                <option value="ROF Pravasa">
                                    ROF Pravasa
                                </option>

                                <option value="ROF Affordable 91">
                                    ROF Affordable 91
                                </option>

                            </select>

                        </div>

                    </div>


          
<!-- REMARKS -->

                    <div
                        class="detail-remarks"
                        style="margin-top:20px;"
                    >

                        <label>
                            Remarks
                        </label>

                        <textarea
                            id="dynamicRemarks"
                            rows="3"
                            style="
                                width:100%;
                                resize:vertical;
                            "
                        ></textarea>

                    </div>


                    <!-- FOOTER -->

                    <div class="modal-footer">

                        <button
                            type="button"
                            id="dynamicCancelAddAsset"
                            class="secondary-btn"
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            class="primary-btn"
                        >
                            Save Asset
                        </button>

                    </div>

                </form>

            </div>

        `;


        document.body.appendChild(modal);


        document
            .getElementById(
                "dynamicCloseAddAsset"
            )
            .addEventListener(
                "click",
                () => closeAddAssetModal()
            );


        document
            .getElementById(
                "dynamicCancelAddAsset"
            )
            .addEventListener(
                "click",
                () => closeAddAssetModal()
            );


        document
            .getElementById(
                "dynamicAssetForm"
            )
            .addEventListener(
                "submit",
                saveNewAsset
            );

    }


    // ========================================================
    // CLOSE ADD ASSET MODAL
    // ========================================================

    function closeAddAssetModal() {

        const modal =
            document.getElementById(
                "dynamicAddAssetModal"
            );


        if (modal) {

            modal.style.display =
                "none";

        }

    }


    // ========================================================
    // OPEN ADD ASSET MODAL
    // ========================================================

    async function openAddAssetModal() {

        createAddAssetModal();


        const modal =
            document.getElementById(
                "dynamicAddAssetModal"
            );


        modal.style.display =
            "flex";


        try {

            const response =
                await fetch(
                    "/api/assets/next-id"
                );


            const data =
                await response.json();


            if (data.success) {

                document
                    .getElementById(
                        "dynamicAssetId"
                    )
                    .value =
                    data.asset_id;

            }

        }

        catch (error) {

            console.error(
                "Asset ID error:",
                error
            );

        }

    }


    // ========================================================
    // ADD ASSET BUTTON
    // ========================================================

    if (addAssetBtn && can("asset_create")) {
        addAssetBtn.addEventListener("click", openAddAssetModal);
    }


    // ========================================================
    // SAVE NEW ASSET
    // ========================================================

    async function saveNewAsset(event) {

        event.preventDefault();


        const assetData = {

            asset_type:
                document
                    .getElementById(
                        "dynamicAssetType"
                    )
                    .value,

            brand:
                document
                    .getElementById(
                        "dynamicBrand"
                    )
                    .value
                    .trim(),

            model:
                document
                    .getElementById(
                        "dynamicModel"
                    )
                    .value
                    .trim(),

            serial_number:
                document
                    .getElementById(
                        "dynamicSerialNumber"
                    )
                    .value
                    .trim(),

            condition:
                document
                    .getElementById(
                        "dynamicCondition"
                    )
                    .value,

            purchase_date:
                document
                    .getElementById(
                        "dynamicPurchaseDate"
                    )
                    .value,

            purchase_cost:
                document
                    .getElementById(
                        "dynamicPurchaseCost"
                    )
                    .value,

            vendor:
                document
                    .getElementById(
                        "dynamicVendor"
                    )
                    .value
                    .trim(),

            warranty_expiry:
                document
                    .getElementById(
                        "dynamicWarrantyExpiry"
                    )
                    .value,

            department:
                document
                    .getElementById(
                        "dynamicDepartment"
                    )
                    .value
                    .trim(),

            location:
                document
                    .getElementById(
                        "dynamicLocation"
                    )
                    .value,

            remarks:
                document
                    .getElementById(
                        "dynamicRemarks"
                    )
                    .value
                    .trim()

        };


        try {

            const response =
                await fetch(
                    "/api/assets",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                assetData
                            )
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                alert(
                    data.message ||
                    "Unable to save asset."
                );

                return;

            }


            alert(
                `${data.asset_id} added successfully.`
            );


            document
                .getElementById(
                    "dynamicAssetForm"
                )
                .reset();


            closeAddAssetModal();


            await loadAssets();

        }

        catch (error) {

            console.error(
                "Save asset error:",
                error
            );


            alert(
                "Server error while saving asset."
            );

        }

    }


    // ========================================================
    // VIEW ASSET
    // ========================================================

    async function viewAsset(assetId) {

        try {
            recordAuditEvent("Asset Viewed", assetId);

            const response =
                await fetch(
                    `/api/assets/${encodeURIComponent(
                        assetId
                    )}`
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                alert(
                    data.message ||
                    "Unable to load asset."
                );

                return;

            }


            const asset =
                data.asset;


            setText(
                "viewAssetId",
                asset.asset_id
            );

            setText(
                "viewAssetType",
                asset.asset_type
            );

            setText(
                "viewBrand",
                asset.brand
            );

            setText(
                "viewModel",
                asset.model || "—"
            );

            setText(
                "viewSerialNumber",
                asset.serial_number
            );

            setText(
                "viewCondition",
                asset.condition
            );

            setText(
                "viewPurchaseDate",
                formatDate(
                    asset.purchase_date
                )
            );

            setText(
                "viewPurchaseCost",
                asset.purchase_cost
                    ? `₹ ${Number(
                        asset.purchase_cost
                    ).toLocaleString("en-IN")}`
                    : "—"
            );

            setText(
                "viewVendor",
                asset.vendor || "—"
            );

            setText(
                "viewWarranty",
                formatDate(
                    asset.warranty_expiry
                )
            );

            setText(
                "viewDepartment",
                asset.department || "—"
            );

            setText(
                "viewLocation",
                asset.location || "—"
            );

            setText(
                "viewStatus",
                asset.status || "—"
            );

            setText(
                "viewRemarks",
                asset.remarks || "—"
            );


            // CLEAR PREVIOUS ASSIGNMENT DATA

            [
                "viewAssignedTo",
                "viewAssignedEmployeeId",
                "viewAssignedEmail",
                "viewAssignedMobile",
                "viewAssignedDesignation",
                "viewAssignedDepartment",
                "viewAssignedLocation",
                "viewAssignedDate"
            ].forEach(
                id =>
                    setText(
                        id,
                        "—"
                    )
            );


            // LOAD ASSIGNMENT HISTORY

            await loadAssignmentHistory(
                assetId
            );


            const modal =
                document.getElementById(
                    "viewAssetModal"
                );


            if (modal) {

                modal.style.display =
                    "flex";

                modal.classList.add(
                    "show"
                );

            }

        }

        catch (error) {

            console.error(
                "View asset error:",
                error
            );


            alert(
                "Unable to load asset details."
            );

        }

    }


    // ========================================================
    // SET TEXT
    // ========================================================

    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                value ?? "—";

        }

    }


    // ========================================================
    // ASSIGNMENT HISTORY
    // ========================================================

    async function loadAssignmentHistory(
        assetId
    ) {

        const container =
            document.getElementById(
                "assignmentHistory"
            );


        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="history-loading">
                Loading history...
            </div>

        `;


        try {

            const response =
                await fetch(
                    `/api/assignments/history/${encodeURIComponent(
                        assetId
                    )}`
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to load history."
                );

            }


            if (
                !data.history ||
                !data.history.length
            ) {

                [
                    "viewAssignedTo",
                    "viewAssignedEmployeeId",
                    "viewAssignedEmail",
                    "viewAssignedMobile",
                    "viewAssignedDesignation",
                    "viewAssignedDepartment",
                    "viewAssignedLocation",
                    "viewAssignedDate"
                ].forEach(
                    id =>
                        setText(
                            id,
                            "—"
                        )
                );


                container.innerHTML = `

                    <div class="history-loading">
                        No assignment history.
                    </div>

                `;

                return;

            }


            container.innerHTML = "";


            // CURRENT ASSIGNMENT

            const current =
                data.history.find(
                    record =>
                    (String(record.assignment_status || "").toLowerCase() === "active" ||
                        (String(record.status || "").toLowerCase() === "assigned" && !record.returned_date))
                ) || null;


            setText(
                "viewAssignedTo",
                current?.employee_name || "—"
            );

            setText(
                "viewAssignedEmployeeId",
                current?.employee_id || "—"
            );

            setText(
                "viewAssignedEmail",
                current?.employee_email || "—"
            );

            setText(
                "viewAssignedMobile",
                current?.employee_mobile || "—"
            );

            setText(
                "viewAssignedDesignation",
                current?.designation || "—"
            );

            setText(
                "viewAssignedDepartment",
                current?.department || "—"
            );

            setText(
                "viewAssignedLocation",
                current?.location || "—"
            );

            setText(
                "viewAssignedDate",
                current
                    ? formatDate(
                        current.assignment_date
                    )
                    : "—"
            );


            // HISTORY LIST

            data.history.forEach(
                record => {

                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "history-item";


                    item.style.cssText = `
                        padding:15px;
                        margin-bottom:10px;
                        border:1px solid #e5e7eb;
                        border-radius:10px;
                    `;


                    item.innerHTML = `

                        <strong>
                            ${escapeHTML(
                        record.employee_name ||
                        "Unknown Employee"
                    )}
                        </strong>

                        <div>
                            Employee ID:
                            ${escapeHTML(
                        record.employee_id ||
                        "—"
                    )}
                        </div>

                        <div>
                            Status:
                            ${escapeHTML(
                        record.status ||
                        "—"
                    )}
                        </div>

                        <div>
                            Designation:
                            ${escapeHTML(
                        record.designation ||
                        "—"
                    )}
                        </div>

                        <div>
                            Department:
                            ${escapeHTML(
                        record.department ||
                        "—"
                    )}
                        </div>

                        <div>
                            Location:
                            ${escapeHTML(
                        record.location ||
                        "—"
                    )}
                        </div>

                        <div>
                            Email:
                            ${escapeHTML(
                        record.employee_email ||
                        "—"
                    )}
                        </div>

                        <div>
                            Mobile:
                            ${escapeHTML(
                        record.employee_mobile ||
                        "—"
                    )}
                        </div>

                        <div>
                            Assigned:
                            ${formatDate(
                        record.assignment_date
                    )}
                        </div>

                        ${record.returned_date
                            ?

                            `
                                <div>
                                    Returned:
                                    ${formatDate(
                                record.returned_date
                            )}
                                </div>
                                `

                            :

                            ""
                        }

                    `;


                    container.appendChild(
                        item
                    );

                }
            );

        }

        catch (error) {

            console.error(
                "History error:",
                error
            );


            container.innerHTML = `

                <div class="history-loading">
                    Unable to load assignment history.
                </div>

            `;

        }

    }


    // ========================================================
    // CLOSE VIEW MODAL
    // ========================================================

    function closeViewModal() {

        const modal =
            document.getElementById(
                "viewAssetModal"
            );


        if (modal) {

            modal.style.display =
                "none";

            modal.classList.remove(
                "show"
            );

        }

    }


    const closeViewAssetModal =
        document.getElementById(
            "closeViewAssetModal"
        );


    const closeViewAssetBtn =
        document.getElementById(
            "closeViewAssetBtn"
        );


    if (closeViewAssetModal) {

        closeViewAssetModal.addEventListener(
            "click",
            closeViewModal
        );

    }


    if (closeViewAssetBtn) {

        closeViewAssetBtn.addEventListener(
            "click",
            closeViewModal
        );

    }

    // ========================================================
    // CREATE ASSIGN MODAL
    // ========================================================
      
    
    function createAssignModal() {

        if (
            document.getElementById(
                "dynamicAssignModal"
            )
        ) {
            return;
        }


        const modal =
            document.createElement("div");


        modal.id =
            "dynamicAssignModal";


        modal.className =
            "modal-overlay";


        modal.innerHTML = `

            <div
                class="modal-box"
                style="
                    max-width:850px;
                    max-height:90vh;
                    overflow-y:auto;
                "
            >

                <div class="modal-header">

                    <div>

                        <h2>
                            Assign Asset
                        </h2>

                        <p>
                            Assign asset to an employee
                        </p>

                    </div>


                    <button
                        type="button"
                        id="closeDynamicAssign"
                        class="modal-close"
                    >
                        ×
                    </button>

                </div>


                <form id="dynamicAssignForm">

                    <div class="details-grid">

                        <!-- ASSET ID -->

                        <div class="detail-item">

                            <label>
                                Asset ID
                            </label>

                            <input
                                id="assignAssetId"
                                type="text"
                                readonly
                                style="width:100%;"
                            >

                        </div>


                        <!-- EMPLOYEE ID -->

                        <div class="detail-item">

                            <label>
                                Employee ID *
                            </label>

                            <input
                                id="assignEmployeeId"
                                type="text"
                                required
                                style="width:100%;"
                            >

                        </div>


                        <!-- EMPLOYEE NAME -->

                        <div class="detail-item">

                            <label>
                                Employee Name *
                            </label>

                            <input
                                id="assignEmployeeName"
                                type="text"
                                required
                                style="width:100%;"
                            >

                        </div>


                        <!-- EMPLOYEE EMAIL -->

                        <div class="detail-item">

                            <label>
                                Employee Email *
                            </label>

                            <input
                                id="assignEmployeeEmail"
                                type="email"
                                required
                                style="width:100%;"
                            >

                        </div>


                        <!-- MOBILE -->

                        <div class="detail-item">

                            <label>
                                Mobile
                            </label>

                            <input
                                id="assignEmployeeMobile"
                                type="tel"
                                style="width:100%;"
                            >

                        </div>


                        <!-- DESIGNATION -->

                        <div class="detail-item">

                            <label>
                                Designation
                            </label>

                            <input
                                id="assignDesignation"
                                type="text"
                                style="width:100%;"
                            >

                        </div>


                        <!-- DEPARTMENT -->

                        <div class="detail-item">

                            <label>
                                Department
                            </label>

                            <input
                                id="assignDepartment"
                                type="text"
                                style="width:100%;"
                            >

                        </div>


                        <!-- LOCATION -->

                        <div class="detail-item">

                            <label>
                                Location
                            </label>

                            <input
                                id="assignLocation"
                                type="text"
                                style="width:100%;"
                            >

                        </div>


                        <!-- ASSIGNMENT DATE -->

                        <div class="detail-item">

                            <label>
                                Assignment Date *
                            </label>

                            <input
                                id="assignDate"
                                type="date"
                                required
                                style="width:100%;"
                            >

                        </div>


                        <!-- EXPECTED RETURN -->

                        <div class="detail-item">

                            <label>
                                Expected Return Date
                            </label>

                            <input
                                id="assignExpectedReturn"
                                type="date"
                                style="width:100%;"
                            >

                        </div>


                        <!-- CONDITION -->

                        <div class="detail-item">

                            <label>
                                Handover Condition *
                            </label>

                            <select
                                id="assignCondition"
                                required
                                style="width:100%;"
                            >

                                <option value="">
                                    Select Condition
                                </option>

                                <option value="New">
                                    New
                                </option>

                                <option value="Good">
                                    Good
                                </option>

                                <option value="Fair">
                                    Fair
                                </option>

                                <option value="Poor">
                                    Poor
                                </option>

                            </select>

                        </div>

                    </div>


                    <!-- ASSET CONDITION, ACCESSORIES AND PHOTO EVIDENCE -->
                    <section id="assetSpecificPanel"
                        style="margin-top:18px;padding:16px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc;">

                        <h3 style="margin:0 0 12px;color:#123b66;">
                            Asset Condition & Accessories
                        </h3>

                        <div id="assetComponentConditions" class="details-grid"></div>

                        <div id="assetAccessories" style="margin-top:14px;"></div>

                        <div style="margin-top:16px;">
                            <label for="issueAssetPhotos"
                                style="display:block;font-weight:600;margin-bottom:6px;">
                                Issue Condition Photos (up to 10, JPG/PNG/WEBP, 5 MB each)
                            </label>

                            <input id="issueAssetPhotos"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                style="width:100%;">

                            <div id="issuePhotoPreview"
                                style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
                            </div>
                        </div>
                    </section>

                    <!-- REMARKS -->

                    <div
                        style="
                            margin-top:20px;
                        "
                    >

                        <label>
                            Assignment Remarks
                        </label>

                        <textarea
                            id="assignRemarks"
                            rows="3"
                            style="
                                width:100%;
                                resize:vertical;
                            "
                        ></textarea>

                    </div>


                    <!-- FOOTER -->

                    <div class="modal-footer">

                        <button
                            type="button"
                            id="cancelDynamicAssign"
                            class="secondary-btn"
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            class="primary-btn"
                        >
                            Assign Asset
                        </button>

                    </div>

                </form>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        document
            .getElementById(
                "closeDynamicAssign"
            )
            .addEventListener(
                "click",
                closeAssignModal
            );


        document
            .getElementById(
                "cancelDynamicAssign"
            )
            .addEventListener(
                "click",
                closeAssignModal
            );


        document
            .getElementById(
                "dynamicAssignForm"
            )
            .addEventListener(
                "submit",
                submitAssignment
            );

        const issuePhotoInput = modal.querySelector("#issueAssetPhotos");
        const issuePhotoPreview = modal.querySelector("#issuePhotoPreview");

        if (issuePhotoInput && issuePhotoPreview) {
            issuePhotoInput.addEventListener("change", function () {
                issuePhotoPreview.innerHTML = "";

                Array.from(this.files || []).slice(0, 10).forEach(file => {
                    if (!file.type.startsWith("image/")) return;

                    const url = URL.createObjectURL(file);
                    const image = document.createElement("img");
                    image.src = url;
                    image.alt = file.name;
                    image.style.cssText = "width:88px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;";
                    image.onload = () => URL.revokeObjectURL(url);
                    issuePhotoPreview.appendChild(image);
                });
            });
        } else {
            console.error("Assignment photo input/preview elements are missing from the assignment modal.");
        }

    }


    // ========================================================
    // CLOSE ASSIGN MODAL
    // ========================================================

    function closeAssignModal() {

        const modal =
            document.getElementById(
                "dynamicAssignModal"
            );


        if (modal) {

            modal.style.display =
                "none";

        }

    }


    function renderAssetSpecificAssignmentFields(asset) {
        const type = String(asset?.asset_type || "Other").toLowerCase();
        let components = [];
        let accessories = [];
        if (type.includes("laptop")) {
            components = ["Display / Screen", "Body", "Keyboard", "Touchpad", "Battery", "Charger / Adapter"];
            accessories = ["Charger / Adapter", "Mouse", "External Keyboard", "Laptop Bag", "Pendrive", "Other"];
        } else if (type.includes("cpu") || type.includes("cabinet") || type.includes("desktop")) {
            components = ["Cabinet Body", "Power Supply", "Cooling Fan", "Ports / Connectivity"];
            accessories = ["Power Cable", "Keyboard", "Mouse", "Pendrive", "Other"];
        } else if (type.includes("monitor")) {
            components = ["Display / Screen", "Monitor Body", "Stand", "Ports / Connectivity"];
            accessories = ["Power Cable", "HDMI Cable", "VGA Cable", "Other"];
        } else if (type.includes("ups")) {
            components = ["UPS Body", "Battery", "Power Indicator", "Working Status"];
            accessories = ["Power Cable", "Keyboard", "Mouse", "Pendrive", "Other"];
        } else if (type.includes("printer")) {
            components = ["Printing", "Scanner / Copier", "Display / Buttons", "Body"];
            accessories = ["Power Cable", "USB Cable", "Network Cable", "Other"];
        } else {
            components = ["Body / Exterior", "Power / Working Status", "Connectivity"];
            accessories = ["Power Cable", "Other"];
        }
        const conditionOptions = ["Brand New", "Good", "Normal", "Damaged", "Needs Repair"];
        document.getElementById("assetComponentConditions").innerHTML = components.map((name, i) => `
            <div class="detail-item"><label>${escapeAssignmentHtml(name)} Condition</label>
            <select data-condition-component="${escapeAssignmentHtml(name)}" style="width:100%;">
                ${conditionOptions.map(v => `<option value="${v}" ${v === (asset.condition || "Good") ? "selected" : ""}>${v}</option>`).join("")}
            </select></div>`).join("");
        document.getElementById("assetAccessories").innerHTML = `
            <div style="font-weight:600;margin-bottom:8px;">Accessories Issued (select only what is handed over)</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
            ${accessories.map((name, i) => `<label style="display:flex;align-items:center;gap:7px;"><input type="checkbox" data-accessory="${escapeAssignmentHtml(name)}"> ${escapeAssignmentHtml(name)}</label>`).join("")}
            </div>
            <div id="accessoryTypes" style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;">
                <label>Keyboard Type <select id="issuedKeyboardType"><option value="">Not issued</option><option>Wired</option><option>Wireless</option></select></label>
                <label>Mouse Type <select id="issuedMouseType"><option value="">Not issued</option><option>Wired</option><option>Wireless</option></select></label>
            </div>`;
        const accessoryBoxes = Array.from(document.querySelectorAll("[data-accessory]"));
        const keyboardBox = accessoryBoxes.find(el => /keyboard/i.test(el.dataset.accessory || ""));
        const mouseBox = accessoryBoxes.find(el => el.dataset.accessory === "Mouse");
        const keyboardType = document.getElementById("issuedKeyboardType");
        const mouseType = document.getElementById("issuedMouseType");
        if (keyboardBox) keyboardBox.addEventListener("change", () => { keyboardType.disabled = !keyboardBox.checked; if (!keyboardBox.checked) keyboardType.value = ""; });
        else keyboardType.disabled = true;
        if (mouseBox) mouseBox.addEventListener("change", () => { mouseType.disabled = !mouseBox.checked; if (!mouseBox.checked) mouseType.value = ""; });
        else mouseType.disabled = true;
    }

    // ========================================================
    // OPEN ASSIGN MODAL
    // ========================================================

    async function openAssignAsset(
        assetId
    ) {

        try {

            // Create the modal inside the guarded block so a DOM/setup
            // problem is reported through the same error path.
            createAssignModal();

            const response =
                await fetch(
                    `/api/assets/${encodeURIComponent(
                        assetId
                    )}`
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                alert(
                    data.message ||
                    "Unable to load asset."
                );

                return;

            }


            const asset = data.asset;
            if (!asset || !asset.asset_id) {
                throw new Error("Asset details were not returned by the server.");
            }
            window.__currentAssignmentAsset = asset;

            // Verify the dynamic assignment fields exist before rendering.
            const requiredAssignmentElements = [
                "assetComponentConditions",
                "assetAccessories",
                "issueAssetPhotos",
                "issuePhotoPreview"
            ];
            const missingAssignmentElements = requiredAssignmentElements.filter(
                id => !document.getElementById(id)
            );
            if (missingAssignmentElements.length) {
                throw new Error(`Assignment form is incomplete: ${missingAssignmentElements.join(", ")}`);
            }

            renderAssetSpecificAssignmentFields(asset);
            document.getElementById("issueAssetPhotos").value = "";
            document.getElementById("issuePhotoPreview").innerHTML = "";


            // =================================================
            // ONLY AVAILABLE ASSET CAN BE ASSIGNED
            // =================================================

            if (
                asset.status !== "Available"
            ) {

                alert(
                    `Asset is currently ${asset.status}. Please return the asset first.`
                );

                return;

            }


            document
                .getElementById(
                    "assignAssetId"
                )
                .value =
                asset.asset_id;


            document
                .getElementById(
                    "assignDepartment"
                )
                .value =
                asset.department || "";


            document
                .getElementById(
                    "assignLocation"
                )
                .value =
                asset.location || "";


            document
                .getElementById(
                    "assignDate"
                )
                .value =
                new Date()
                    .toISOString()
                    .split("T")[0];


            document
                .getElementById(
                    "assignCondition"
                )
                .value =
                asset.condition || "";


            // CLEAR EMPLOYEE FIELDS

            document
                .getElementById(
                    "assignEmployeeId"
                )
                .value = "";


            document
                .getElementById(
                    "assignEmployeeName"
                )
                .value = "";


            document
                .getElementById(
                    "assignEmployeeEmail"
                )
                .value = "";


            document
                .getElementById(
                    "assignEmployeeMobile"
                )
                .value = "";


            document
                .getElementById(
                    "assignDesignation"
                )
                .value = "";


            document
                .getElementById(
                    "assignExpectedReturn"
                )
                .value = "";


            document
                .getElementById(
                    "assignRemarks"
                )
                .value = "";


            const modal =
                document.getElementById(
                    "dynamicAssignModal"
                );


            modal.style.display =
                "flex";

        }

        catch (error) {

            console.error(
                "Open assign error:",
                error
            );


            const detail = error && error.message ? error.message : String(error || "Unknown error");
            alert(`Unable to open assignment form. ${detail}`);

        }

    }


    // ========================================================
    // SUBMIT ASSIGNMENT
    // ========================================================

    async function submitAssignment(event) {
        event.preventDefault();

        // ----------------------------------------------------
        // GET CURRENT ASSET DETAILS
        // ----------------------------------------------------

        const assetId =
            document
                .getElementById("assignAssetId")
                ?.value
                ?.trim() || "";

        const currentAsset =
            window.__currentAssignmentAsset || {};

        const assetName =
            currentAsset.asset_type ||
            "";

        const assetModel =
            currentAsset.model ||
            "";

        const serialNumber =
            currentAsset.serial_number ||
            "";

        // ----------------------------------------------------
        // GET EMPLOYEE DETAILS
        // ----------------------------------------------------

        const employeeId =
            document
                .getElementById("assignEmployeeId")
                ?.value
                ?.trim() || "";

        const employeeName =
            document
                .getElementById("assignEmployeeName")
                ?.value
                ?.trim() || "";

        const employeeEmail =
            document
                .getElementById("assignEmployeeEmail")
                ?.value
                ?.trim() || "";

        const employeeMobile =
            document
                .getElementById("assignEmployeeMobile")
                ?.value
                ?.trim() || "";

        const designation =
            document
                .getElementById("assignDesignation")
                ?.value
                ?.trim() || "";

        const department =
            document
                .getElementById("assignDepartment")
                ?.value
                ?.trim() || "";

        const location =
            document
                .getElementById("assignLocation")
                ?.value
                ?.trim() || "";

        // ----------------------------------------------------
        // GET ASSIGNMENT DETAILS
        // ----------------------------------------------------

        const assignmentDate =
            document
                .getElementById("assignDate")
                ?.value || "";

        const expectedReturnDate =
            document
                .getElementById("assignExpectedReturn")
                ?.value || "";

        const handoverCondition =
            document
                .getElementById("assignCondition")
                ?.value || "Good";

        const assignmentRemarks =
            document
                .getElementById("assignRemarks")
                ?.value
                ?.trim() || "";

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!assetId) {
            alert("Please select an asset.");
            return;
        }

        if (!employeeId) {
            alert("Please enter Employee Code.");
            return;
        }

        if (!employeeName) {
            alert("Please enter Employee Name.");
            return;
        }

        if (!assignmentDate) {
            alert("Please select Assignment Date.");
            return;
        }

        // ----------------------------------------------------
        // ASSIGNMENT DATA FOR DATABASE
        // ----------------------------------------------------

        const assignmentData = {
            asset_id: assetId,

            employee_id: employeeId,
            employee_name: employeeName,
            employee_email: employeeEmail,
            employee_mobile: employeeMobile,

            designation: designation,
            department: department,
            location: location,

            assignment_date: assignmentDate,
            expected_return_date: expectedReturnDate,

            handover_condition: handoverCondition,
            assignment_remarks: assignmentRemarks,
            condition_details: {
                components: Object.fromEntries(Array.from(document.querySelectorAll("[data-condition-component]")).map(el => [el.dataset.conditionComponent, el.value])),
                accessories: Array.from(document.querySelectorAll("[data-accessory]:checked")).map(el => el.dataset.accessory),
                keyboard_type: document.getElementById("issuedKeyboardType")?.value || "",
                mouse_type: document.getElementById("issuedMouseType")?.value || ""
            }
        };

        console.log(
            "Assignment data:",
            assignmentData
        );

        // ----------------------------------------------------
        // SAVE ASSIGNMENT
        // ----------------------------------------------------

        try {

            const response =
                await fetch(
                    "/api/assignments",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                assignmentData
                            )
                    }
                );

            const data =
                await response.json();

            console.log(
                "Assignment response:",
                data
            );

            // ------------------------------------------------
            // ERROR
            // ------------------------------------------------

            if (!response.ok) {

                alert(
                    data.error ||
                    data.message ||
                    "Unable to assign asset."
                );

                return;
            }

            // Save issue-condition photos against the newly created assignment.
            const issuePhotoFiles = Array.from(document.getElementById("issueAssetPhotos")?.files || []);
            if (issuePhotoFiles.length) {
                if (issuePhotoFiles.length > 10 || issuePhotoFiles.some(file => file.size > 5 * 1024 * 1024)) {
                    alert("Photos were not uploaded: maximum 10 photos, 5 MB each. The asset assignment is saved; upload photos from assignment history.");
                } else {
                    const photoForm = new FormData();
                    photoForm.append("stage", "issue");
                    issuePhotoFiles.forEach(file => photoForm.append("photos", file));
                    const photoResponse = await fetch(`/api/assignments/${data.assignment_id}/photos`, { method: "POST", body: photoForm });
                    const photoResult = await photoResponse.json();
                    if (!photoResponse.ok || !photoResult.success) console.error("Issue photo upload failed:", photoResult.message);
                }
            }

            // ------------------------------------------------
            // SAVE DATA FOR PRINT FORM
            // ------------------------------------------------

            const printData = {

                // Asset
                assetId: assetId,
                assetName: assetName,
                assetModel: assetModel,
                serialNumber: serialNumber,

                // Employee
                employeeCode: employeeId,
                employeeName: employeeName,
                employeeEmail: employeeEmail,
                mobileNumber: employeeMobile,

                // Organisation
                designation: designation,
                department: department,
                location: location, processor: (document.getElementById("assignProcessor")?.value || "").trim(), ram: (document.getElementById("assignRam")?.value || "").trim(), storage: (document.getElementById("assignStorage")?.value || "").trim(), os: (document.getElementById("assignOs")?.value || "").trim(), reportingTo: (document.getElementById("assignReportingTo")?.value || "").trim(),

                // Assignment
                issuedDate: assignmentDate,
                expectedReturnDate:
                    expectedReturnDate,

                // Issuer
                issuedBy:
                    data.issuedBy ||
                    data.issued_by ||
                    window.currentUser?.name ||
                    "Admin",

                // Condition
                displayCondition:
                    handoverCondition,

                bodyCondition:
                    handoverCondition,

                chargerCondition:
                    "N/A",

                keyboardCondition:
                    "N/A",

                mouseCondition:
                    "N/A",

                // Remarks
                assignmentRemarks:
                    assignmentRemarks,
                conditionDetails: assignmentData.condition_details,
                accessories: (assignmentData.condition_details.accessories || []).map(name => {
                    if (name === "Keyboard" && assignmentData.condition_details.keyboard_type) return `${assignmentData.condition_details.keyboard_type} Keyboard`;
                    if (name === "Mouse" && assignmentData.condition_details.mouse_type) return `${assignmentData.condition_details.mouse_type} Mouse`;
                    return name;
                }).join(", "),
                assignmentId: data.assignment_id
            };

            // ------------------------------------------------
            // STORE CURRENT ASSIGNMENT
            // ------------------------------------------------

            localStorage.setItem(
                "rof_print_assignment",
                JSON.stringify(
                    printData
                )
            );

            console.log(
                "Print data saved:",
                printData
            );

            // ------------------------------------------------
            // CLOSE ASSIGN MODAL
            // ------------------------------------------------

            closeAssignModal();

            // ------------------------------------------------
            // REFRESH ASSETS
            // ------------------------------------------------

            try {
                await loadAssets();
            } catch (refreshError) {
                console.error("Asset list refresh failed:", refreshError);
            }

        }
        catch (error) {

            console.error(
                "Assignment error:",
                error
            );

            alert(
                "Server error while assigning asset."
            );
        }
    }


    // ========================================================
    // ASSIGNMENT SUCCESS POPUP
    // ========================================================

    function showAssignmentSuccessPopup(
        assignment
    ) {

        // Remove old popup if already exists
        const oldPopup =
            document.getElementById(
                "assignmentSuccessPopup"
            );

        if (oldPopup) {
            oldPopup.remove();
        }

        // ----------------------------------------------------
        // CREATE POPUP
        // ----------------------------------------------------

        const overlay =
            document.createElement("div");

        overlay.id =
            "assignmentSuccessPopup";

        overlay.innerHTML = `

        <div class="assignment-success-overlay">

            <div class="assignment-success-card">

                <button
                    type="button"
                    class="assignment-success-close"
                    id="assignmentSuccessClose"
                >
                    ×
                </button>

                <div class="assignment-success-icon">
                    ✓
                </div>

                <h2>
                    Asset Assigned Successfully
                </h2>

                <p class="assignment-success-message">
                    The asset has been successfully assigned
                    to the employee.
                </p>

                <div class="assignment-success-details">

                    <div class="success-detail-item">

                        <span class="success-detail-label">
                            Asset ID
                        </span>

                        <strong>
                            ${escapeAssignmentHtml(
            assignment.assetId || "—"
        )}
                        </strong>

                    </div>


                    <div class="success-detail-item">

                        <span class="success-detail-label">
                            Employee Code
                        </span>

                        <strong>
                            ${escapeAssignmentHtml(
            assignment.employeeCode || "—"
        )}
                        </strong>

                    </div>


                    <div class="success-detail-item">

                        <span class="success-detail-label">
                            Employee Name
                        </span>

                        <strong>
                            ${escapeAssignmentHtml(
            assignment.employeeName || "—"
        )}
                        </strong>

                    </div>


                    <div class="success-detail-item">

                        <span class="success-detail-label">
                            Department
                        </span>

                        <strong>
                            ${escapeAssignmentHtml(
            assignment.department || "—"
        )}
                        </strong>

                    </div>

                </div>


                <div class="assignment-success-actions">

                    <button
                        type="button"
                        class="success-print-btn"
                        id="printAssignmentFormBtn"
                    >
                        🖨 Print Issuance Form
                    </button>


                    <button
                        type="button"
                        class="success-close-btn"
                        id="closeAssignmentSuccessBtn"
                    >
                        Close
                    </button>

                </div>

            </div>

        </div>
    `;

        document.body.appendChild(
            overlay
        );


        // ----------------------------------------------------
        // PRINT BUTTON
        // ----------------------------------------------------

        document
            .getElementById(
                "printAssignmentFormBtn"
            )
            .addEventListener(
                "click",
                function () {

                    // Make sure latest assignment data is saved before opening the form
                    localStorage.setItem(
                        "rof_print_assignment",
                        JSON.stringify(assignment)
                    );

                    const printWindow = window.open(
                        "asset-issuance.html?source=assignment",
                        "_blank"
                    );

                    if (!printWindow) {
                        alert("Please allow pop-ups for this site to open the Issuance Form.");
                        return;
                    }

                    closeAssignmentSuccessPopup();
                }
            );


        // ----------------------------------------------------
        // CLOSE BUTTON
        // ----------------------------------------------------

        document
            .getElementById(
                "closeAssignmentSuccessBtn"
            )
            .addEventListener(
                "click",
                closeAssignmentSuccessPopup
            );


        document
            .getElementById(
                "assignmentSuccessClose"
            )
            .addEventListener(
                "click",
                closeAssignmentSuccessPopup
            );


        // ----------------------------------------------------
        // CLICK OUTSIDE
        // ----------------------------------------------------

        overlay
            .querySelector(
                ".assignment-success-overlay"
            )
            .addEventListener(
                "click",
                function (event) {

                    if (
                        event.target === this
                    ) {
                        closeAssignmentSuccessPopup();
                    }

                }
            );
    }


    // ========================================================
    // CLOSE SUCCESS POPUP
    // ========================================================

    function closeAssignmentSuccessPopup() {

        const popup =
            document.getElementById(
                "assignmentSuccessPopup"
            );

        if (popup) {
            popup.remove();
        }
    }


    // ========================================================
    // ESCAPE HTML
    // ========================================================

    function escapeAssignmentHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }
    // ========================================================
    // CREATE ASSET ASSIGN SELECTOR
    // ========================================================

    function createAssetAssignSelector() {

        if (
            document.getElementById(
                "assetAssignSelectorModal"
            )
        ) {
            return;
        }

        const modal =
            document.createElement(
                "div"
            );

        modal.id =
            "assetAssignSelectorModal";

        modal.className =
            "modal-overlay";

        modal.innerHTML = `
        <div class="modal-box asset-selector-modal">

            <div class="modal-header">

                <div>
                    <h2>
                        Assign / Return Asset
                    </h2>

                    <p>
                        Search and select an asset
                    </p>
                </div>

                <button
                    type="button"
                    id="closeAssetSelector"
                    class="modal-close"
                >
                    ×
                </button>

            </div>


            <div class="asset-selector-body">

                <div class="asset-search-box">

                    <span
                        class="asset-search-icon"
                    >
                        🔍
                    </span>

                    <input
                        type="text"
                        id="assignAssetSearch"
                        placeholder="Search by Asset ID, Serial Number, Brand, Model or Location..."
                        autocomplete="off"
                    >

                </div>


                <div class="asset-selector-info">

                    <span>
                        Assets
                    </span>

                    <span
                        id="assignAssetResultCount"
                    >
                        0 assets
                    </span>

                </div>


                <div
                    id="assignAssetSearchResults"
                    class="asset-search-results"
                >
                </div>

            </div>


            <div class="asset-selector-footer">

                <button
                    type="button"
                    id="cancelAssetSelector"
                    class="secondary-btn"
                >
                    Cancel
                </button>

            </div>

        </div>
    `;

        document.body.appendChild(
            modal
        );


        const searchInput =
            document.getElementById(
                "assignAssetSearch"
            );


        const results =
            document.getElementById(
                "assignAssetSearchResults"
            );


        const resultCount =
            document.getElementById(
                "assignAssetResultCount"
            );


        // ====================================================
        // RENDER AVAILABLE + ASSIGNED ASSETS
        // ====================================================

        function renderAvailableAssets(
            searchTerm = ""
        ) {

            const term =
                searchTerm
                    .trim()
                    .toLowerCase();


            // =================================================
            // SHOW AVAILABLE + ASSIGNED
            // =================================================

            const selectableAssets =
                allAssets.filter(
                    asset =>
                        asset.status ===
                        "Available" ||

                        asset.status ===
                        "Assigned"
                );


            // =================================================
            // SEARCH
            // =================================================

            const filteredAssets =
                selectableAssets.filter(
                    asset => {

                        if (!term) {
                            return true;
                        }


                        const searchableText = [
                            asset.asset_id,
                            asset.asset_type,
                            asset.brand,
                            asset.model,
                            asset.serial_number,
                            asset.location,
                            asset.assigned_to,
                            asset.status
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();


                        return searchableText
                            .includes(
                                term
                            );
                    }
                );


            resultCount.textContent =
                `${filteredAssets.length} asset${filteredAssets.length === 1
                    ? ""
                    : "s"
                }`;


            // =================================================
            // NO RESULTS
            // =================================================

            if (!filteredAssets.length) {

                results.innerHTML = `
                <div class="asset-search-empty">

                    <div class="empty-icon">
                        🔍
                    </div>

                    <strong>
                        No assets found
                    </strong>

                    <p>
                        Try another Asset ID,
                        brand, serial number
                        or model.
                    </p>

                </div>
            `;

                return;
            }


            // =================================================
            // RENDER RESULTS
            // =================================================

            results.innerHTML =
                filteredAssets
                    .map(
                        asset => {

                            const isAvailable =
                                asset.status ===
                                "Available";


                            const isAssigned =
                                asset.status ===
                                "Assigned";


                            let actionHTML =
                                "";


                            // =================================
                            // AVAILABLE → ASSIGN
                            // =================================

                            if (
                                isAvailable
                            ) {

                                actionHTML = `
                                <button
                                    type="button"
                                    class="asset-select-btn"
                                    data-action="assign"
                                    data-asset-id="${escapeHTML(
                                    asset.asset_id
                                )}"
                                >
                                    Assign
                                </button>
                            `;
                            }


                            // =================================
                            // ASSIGNED → RETURN
                            // =================================

                            else if (
                                isAssigned
                            ) {

                                actionHTML = `
                                <button
                                    type="button"
                                    class="asset-return-selector-btn"
                                    data-action="return"
                                    data-asset-id="${escapeHTML(
                                    asset.asset_id
                                )}"
                                >
                                    Return
                                </button>
                            `;
                            }


                            return `
                            <div
                                class="asset-search-result"
                                data-asset-id="${escapeHTML(
                                asset.asset_id
                            )}"
                            >

                                <div
                                    class="asset-result-main"
                                >

                                    <div
                                        class="asset-result-title"
                                    >
                                        ${escapeHTML(
                                asset.asset_id
                            )}
                                    </div>


                                    <div
                                        class="asset-result-description"
                                    >
                                        ${escapeHTML(
                                asset.asset_type ||
                                "Asset"
                            )}

                                        <span>
                                            •
                                        </span>

                                        ${escapeHTML(
                                asset.brand ||
                                "—"
                            )}

                                        <span>
                                            •
                                        </span>

                                        ${escapeHTML(
                                asset.model ||
                                "—"
                            )}
                                    </div>


                                    <div
                                        class="asset-result-meta"
                                    >

                                        <span>
                                            Serial:
                                            ${escapeHTML(
                                asset.serial_number ||
                                "—"
                            )}
                                        </span>


                                        <span>
                                            Location:
                                            ${escapeHTML(
                                asset.location ||
                                "—"
                            )}
                                        </span>


                                        <span>
                                            Status:
                                            ${escapeHTML(
                                asset.status ||
                                "—"
                            )}
                                        </span>


                                        ${isAssigned &&
                                    asset.assigned_to
                                    ?

                                    `
                                                <span>
                                                    Assigned To:
                                                    ${escapeHTML(
                                        asset.assigned_to
                                    )}
                                                </span>
                                                `

                                    :

                                    ""
                                }

                                    </div>

                                </div>


                                <div
                                    class="asset-result-action"
                                >
                                    ${wrapActionMenu(actionHTML)}
                                </div>

                            </div>
                        `;
                        }
                    )
                    .join("");


            // =================================================
            // ASSIGN BUTTON
            // =================================================

            results
                .querySelectorAll(
                    '[data-action="assign"]'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            async function () {

                                const assetId =
                                    this.dataset.assetId;


                                modal.style.display =
                                    "none";


                                await openAssignAsset(
                                    assetId
                                );

                            }
                        );

                    }
                );


            // =================================================
            // RETURN BUTTON
            // =================================================

            results
                .querySelectorAll(
                    '[data-action="return"]'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            async function () {

                                const assetId =
                                    this.dataset.assetId;


                                modal.style.display =
                                    "none";


                                await returnAsset(
                                    assetId
                                );

                            }
                        );

                    }
                );

        }


        // ====================================================
        // SEARCH EVENT
        // ====================================================

        searchInput.addEventListener(
            "input",
            function () {

                renderAvailableAssets(
                    this.value
                );

            }
        );


        // ====================================================
        // CLOSE SELECTOR
        // ====================================================

        function closeSelector() {

            modal.style.display =
                "none";


            searchInput.value = "";

        }


        document
            .getElementById(
                "closeAssetSelector"
            )
            .addEventListener(
                "click",
                closeSelector
            );


        document
            .getElementById(
                "cancelAssetSelector"
            )
            .addEventListener(
                "click",
                closeSelector
            );


        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    closeSelector();

                }

            }
        );


        renderAvailableAssets();

        searchInput.focus();

    }


    // ========================================================
    // OPEN TOP ASSIGN ASSET
    // ========================================================

    function openTopAssignAsset() {

        createAssetAssignSelector();


        const modal =
            document.getElementById(
                "assetAssignSelectorModal"
            );


        modal.style.display =
            "flex";


        const searchInput =
            document.getElementById(
                "assignAssetSearch"
            );


        if (searchInput) {

            searchInput.value = "";

            searchInput.focus();

        }

    }


    // ========================================================
    // TOP ASSIGN BUTTON
    // ========================================================

    const assignAssetTopBtn =
        document.getElementById(
            "assignAssetTopBtn"
        );


    if (assignAssetTopBtn && window.ROFAccess?.has?.("asset_assign")) {
        assignAssetTopBtn.addEventListener("click", openTopAssignAsset);
    }


    // ========================================================
    // PRINT CURRENT ASSIGNMENT
    // ========================================================

    async function printAssignmentForm(assetId) {
        // Open the form window immediately from the user's click so the browser
        // does not block it after the asynchronous API calls complete.
        const printWindow = window.open("about:blank", "_blank");

        try {
            if (!printWindow) {
                throw new Error("Please allow pop-ups for this site to open the issuance form.");
            }

            printWindow.document.title = "ROF Asset Issuance Form";
            printWindow.document.body.innerHTML = '<div style="font-family:Arial;padding:40px;text-align:center;color:#475569">Loading issuance form...</div>';

            const response = await fetch(`/api/assignments/current/${encodeURIComponent(assetId)}`);
            const data = await response.json();

            const assetResponse = await fetch(`/api/assets/${encodeURIComponent(assetId)}`);
            const assetData = await assetResponse.json();
            if (!assetResponse.ok || !assetData.success || !assetData.asset) {
                throw new Error(assetData.message || "Unable to load asset details.");
            }

            const a = assetData.asset;
            const aa = data.assignment || {};

            // A print form must never silently print the wrong/old employee.
            // If the asset is assigned, require a real current assignment record.
            const assetStatus = String(a.status || "").trim().toLowerCase();
            const hasCurrentAssignment = Boolean(
                aa && (aa.employee_name || aa.employee_id)
            );
            if (
                ["assigned", "active", "issued"].includes(assetStatus) &&
                !hasCurrentAssignment
            ) {
                throw new Error(
                    "This asset is marked Assigned, but no current assignee details were found."
                );
            }

            let savedConditionDetails = {};
            try {
                const detailsResponse = await fetch(`/api/assignments/${encodeURIComponent(aa.id)}/details`);
                const detailsData = await detailsResponse.json();
                if (detailsResponse.ok && detailsData.success) savedConditionDetails = detailsData.details || {};
            } catch (detailsError) { console.warn("Condition details could not be loaded for print:", detailsError); }

            const printData = {
                conditionDetails: savedConditionDetails,
                accessories: (savedConditionDetails.accessories || []).map(name => {
                    if (name === "Keyboard" && savedConditionDetails.keyboard_type) return `${savedConditionDetails.keyboard_type} Keyboard`;
                    if (name === "Mouse" && savedConditionDetails.mouse_type) return `${savedConditionDetails.mouse_type} Mouse`;
                    return name;
                }).join(", "),
                assetId: a.asset_id, assetName: a.asset_type || "", assetModel: a.model || "",
                serialNumber: a.serial_number || "", employeeCode: aa.employee_id || a.assigned_employee_id || "",
                employeeName: aa.employee_name || a.assigned_to || "", employeeEmail: aa.employee_email || a.assigned_employee_email || "",
                mobileNumber: aa.employee_mobile || a.assigned_employee_mobile || "", designation: aa.designation || a.assigned_designation || "",
                department: aa.department || a.assigned_department || a.department || "", location: aa.location || a.assigned_location || a.location || "",
                issuedDate: aa.assignment_date || a.assigned_date || "", expectedReturnDate: aa.expected_return_date || a.assigned_expected_return_date || "",
                issuedBy: aa.issued_by || a.assigned_issued_by || (window.currentUser && (window.currentUser.full_name || window.currentUser.name)) || "Admin",
                assetCondition: aa.handover_condition || a.condition || "",
                condition: aa.handover_condition || a.condition || "",
                bodyCondition: aa.handover_condition || a.condition || "",
                assignmentRemarks: aa.assignment_remarks || ""
            };

            localStorage.setItem("rof_print_assignment", JSON.stringify(printData));
            printWindow.location.href = "asset-issuance.html?source=assignment";
        } catch (error) {
            console.error("Print assignment error:", error);
            if (printWindow && !printWindow.closed) printWindow.close();
            alert(error.message || "Unable to open issuance form.");
        }
    }

    // ========================================================
    // MARK REPAIR COMPLETED / RECEIVED
    // ========================================================

    async function completeRepair(assetId) {
        const remarks = prompt("Repair completion remarks (optional):", "");
        if (remarks === null) return;
        const condition = prompt("Condition after repair:", "Good");
        if (!condition) return;

        try {
            const response = await fetch("/api/assets/repair/complete", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ asset_id: assetId, condition, remarks })
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Unable to complete repair.");
            alert("Asset received after repair and is now Available.");
            await loadAssets();
        } catch (error) {
            console.error("Repair completion error:", error);
            alert(error.message || "Unable to complete repair.");
        }
    }

    // ========================================================
    // SEND ASSET FOR REPAIR
    // ========================================================

    async function sendForRepair(assetId) {
        const problem = prompt("Repair issue / problem:", "");
        if (problem === null) return;
        if (!problem.trim()) {
            alert("Please enter the repair issue.");
            return;
        }

        const sentTo = prompt("Repair vendor / service center (optional):", "");
        if (sentTo === null) return;

        try {
            const response = await fetch("/api/assets/repair/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ asset_id: assetId, problem, sent_to: sentTo })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to send asset for repair.");
            }
            alert("Asset marked as Under Repair.");
            await loadAssets();
        } catch (error) {
            console.error("Send for repair error:", error);
            alert(error.message || "Unable to send asset for repair.");
        }
    }


    // ========================================================
    // RETIRE ASSET
    // ========================================================

    async function retireAsset(assetId) {
        const confirmed = confirm(`Retire asset ${assetId}?\n\nA retired asset cannot be assigned.`);
        if (!confirmed) return;

        const remarks = prompt("Retirement remarks (optional):", "");
        if (remarks === null) return;

        try {
            const response = await fetch("/api/assets/retire", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ asset_id: assetId, remarks })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to retire asset.");
            }
            alert("Asset retired successfully.");
            await loadAssets();
        } catch (error) {
            console.error("Retire asset error:", error);
            alert(error.message || "Unable to retire asset.");
        }
    }


    // ========================================================
    // RETURN ASSET
    // ========================================================

    async function returnAsset(assetId) {
        const confirmed = confirm(`Return asset ${assetId}?`);
        if (!confirmed) return;

        const returnCondition = prompt("Enter return condition:", "Good");
        if (!returnCondition) return;
        const returnRemarks = prompt("Return remarks (optional):", "");
        if (returnRemarks === null) return;

        // Optional return-condition photo capture/upload. The same storage model
        // supports a future browser-camera capture flow without changing records.
        const addPhotos = confirm("Do you want to attach return-condition photos now?");
        let returnFiles = [];
        if (addPhotos) {
            const picker = document.createElement("input");
            picker.type = "file";
            picker.accept = "image/jpeg,image/png,image/webp";
            picker.multiple = true;
            returnFiles = await new Promise(resolve => {
                picker.addEventListener("change", () => resolve(Array.from(picker.files || [])), { once: true });
                picker.addEventListener("cancel", () => resolve([]), { once: true });
                picker.click();
            });
            if (returnFiles.length > 10 || returnFiles.some(file => file.size > 5 * 1024 * 1024)) {
                alert("Please select up to 10 photos, each no larger than 5 MB.");
                return;
            }
        }

        try {
            const currentResponse = await fetch(`/api/assignments/current/${encodeURIComponent(assetId)}`);
            const currentData = await currentResponse.json();
            const assignmentId = currentData.assignment?.id;

            const response = await fetch("/api/assignments/return", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    asset_id: assetId,
                    returned_date: new Date().toLocaleDateString("en-CA"),
                    return_condition: returnCondition,
                    return_remarks: returnRemarks || ""
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                alert(data.message || "Unable to return asset.");
                return;
            }

            if (returnFiles.length && assignmentId) {
                const photoForm = new FormData();
                photoForm.append("stage", "return");
                returnFiles.forEach(file => photoForm.append("photos", file));
                const photoResponse = await fetch(`/api/assignments/${assignmentId}/photos`, { method: "POST", body: photoForm });
                const photoData = await photoResponse.json();
                if (!photoResponse.ok || !photoData.success) alert("Asset returned, but return photos could not be saved: " + (photoData.message || "Unknown error"));
            }

            alert("Asset returned successfully.");
            await loadAssets();
        } catch (error) {
            console.error("Return asset error:", error);
            alert("Server error while returning asset.");
        }
    }


    async function viewAssetPhotos(assetId) {
        try {
            const currentResponse = await fetch(`/api/assignments/current/${encodeURIComponent(assetId)}`);
            const currentData = await currentResponse.json();
            let assignmentId = currentData.assignment?.id;
            if (!assignmentId) {
                const historyResponse = await fetch(`/api/assignments/history/${encodeURIComponent(assetId)}`);
                const historyData = await historyResponse.json();
                assignmentId = historyData.history?.[0]?.id;
            }
            if (!assignmentId) { alert("No assignment photo history is available for this asset yet."); return; }
            const response = await fetch(`/api/assignments/${assignmentId}/photos`);
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Unable to load photos.");
            const old = document.getElementById("assetPhotoGalleryOverlay"); if (old) old.remove();
            const overlay = document.createElement("div");
            overlay.id = "assetPhotoGalleryOverlay";
            overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;";
            const cards = (data.photos || []).map(photo => `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff;"><a href="/api/assignments/photo/${photo.id}" target="_blank" rel="noopener"><img src="/api/assignments/photo/${photo.id}" alt="Asset condition" style="width:220px;height:165px;object-fit:cover;border-radius:6px;"></a><div style="font-weight:600;margin-top:7px;">${photo.photo_stage === "issue" ? "At Issue" : "At Return"}</div><small style="color:#64748b;">${escapeAssignmentHtml(photo.uploaded_at || "")}</small></div>`).join("");
            overlay.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:900px;width:100%;max-height:90vh;overflow:auto;padding:22px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;color:#123b66;">${escapeAssignmentHtml(assetId)} — Condition Photos</h2><button id="closeAssetPhotoGallery" type="button" style="padding:8px 14px;">Close</button></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">${cards || "<p>No photos have been uploaded for this assignment.</p>"}</div></div>`;
            document.body.appendChild(overlay);
            document.getElementById("closeAssetPhotoGallery").addEventListener("click", () => overlay.remove());
            overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });
        } catch (error) { console.error("Asset photo gallery error:", error); alert(error.message || "Unable to load asset photos."); }
    }

    // ========================================================
    // TABLE BUTTON HANDLER
    // ========================================================

    if (tbody) {

        tbody.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "button[data-action]"
                    );


                if (!button) {

                    return;

                }


                const action =
                    button.dataset.action;


                const assetId =
                    button.dataset.assetId;


                if (!assetId) {

                    return;

                }


                if (action === "photos") {
                    viewAssetPhotos(assetId);
                }
                else if (
                    action === "view"
                ) {

                    viewAsset(
                        assetId
                    );

                }


                else if (
                    action === "assign"
                ) {

                    openAssignAsset(
                        assetId
                    );

                }


                else if (
                    action === "return"
                ) {

                    returnAsset(
                        assetId
                    );

                }

                else if (action === "print") {
                    recordAuditEvent("Asset Print Requested", assetId);
                    printAssignmentForm(assetId);
                }

                else if (action === "repair") {
                    sendForRepair(assetId);
                }

                else if (action === "retire") {
                    retireAsset(assetId);
                }

                else if (action === "repair-complete") {
                    completeRepair(assetId);
                }

            }
        );

    }


    // ========================================================
    // EXPOSE FUNCTIONS
    // ========================================================

    window.viewAsset =
        viewAsset;


    window.openAssignAsset =
        openAssignAsset;


    window.returnAsset =
        returnAsset;

    window.printAssignmentForm =
        printAssignmentForm;

    window.completeRepair =
        completeRepair;

    window.sendForRepair =
        sendForRepair;

    window.retireAsset =
        retireAsset;


    // ============================================================
    // IMPORT ASSETS
    // ============================================================

    function createImportModal() {

        if (
            document.getElementById(
                "dynamicImportAssetModal"
            )
        ) {

            return;

        }


        const modal =
            document.createElement(
                "div"
            );


        modal.id =
            "dynamicImportAssetModal";


        modal.className =
            "modal-overlay";


        modal.innerHTML = `

        <div
            class="modal-box"
            style="
                max-width:650px;
                width:95%;
            "
        >

            <div class="modal-header">

                <div>

                    <h2>
                        Import Assets
                    </h2>

                    <p>
                        Import assets from Excel or CSV
                    </p>

                </div>


                <button
                    type="button"
                    id="closeImportAssetModal"
                    class="modal-close"
                >
                    ×
                </button>

            </div>


            <div
                style="
                    padding:10px 0 20px;
                "
            >

                <div
                    style="
                        background:#f8fafc;
                        border:1px solid #e5e7eb;
                        border-radius:10px;
                        padding:18px;
                        margin-bottom:20px;
                    "
                >

                    <strong>
                        Import Instructions
                    </strong>

                    <p
                        style="
                            margin:8px 0 0;
                            color:#6b7280;
                            font-size:13px;
                            line-height:1.6;
                        "
                    >
                        Select an Excel or CSV file
                        containing your asset data.
                        Required fields are:
                        Asset Type, Brand, Serial Number,
                        Condition and Location.
                    </p>

                </div>


                <div
                    style="
                        border:2px dashed #d1d5db;
                        border-radius:12px;
                        padding:30px 20px;
                        text-align:center;
                    "
                >

                    <div
                        style="
                            font-size:32px;
                            margin-bottom:10px;
                        "
                    >
                        📁
                    </div>


                    <strong>
                        Select Asset File
                    </strong>


                    <p
                        style="
                            color:#6b7280;
                            font-size:13px;
                            margin:8px 0 18px;
                        "
                    >
                        Supported formats:
                        .xlsx, .xls, .csv
                    </p>


                    <input
                        type="file"
                        id="assetImportFile"
                        accept=".xlsx,.xls,.csv"
                        style="
                            display:block;
                            width:100%;
                            max-width:400px;
                            margin:0 auto;
                        "
                    >

                </div>


                <div
                    id="assetImportResult"
                    style="
                        display:none;
                        margin-top:18px;
                        padding:14px;
                        border-radius:8px;
                        font-size:14px;
                    "
                ></div>


                <div
                    id="assetImportFileInfo"
                    style="
                        display:none;
                        margin-top:15px;
                        padding:12px;
                        background:#f9fafb;
                        border-radius:8px;
                        font-size:13px;
                        color:#374151;
                    "
                ></div>

            </div>


            <div
                style="
                    display:flex;
                    justify-content:flex-end;
                    gap:10px;
                    padding-top:15px;
                    border-top:1px solid #e5e7eb;
                "
            >

                <button
                    type="button"
                    id="cancelImportAsset"
                    class="secondary-btn"
                >
                    Cancel
                </button>


                <button
                    type="button"
                    id="submitImportAsset"
                    class="primary-btn"
                    disabled
                >
                    Import Assets
                </button>

            </div>

        </div>

    `;


        document.body.appendChild(
            modal
        );


        const closeButton =
            document.getElementById(
                "closeImportAssetModal"
            );


        const cancelButton =
            document.getElementById(
                "cancelImportAsset"
            );


        const fileInput =
            document.getElementById(
                "assetImportFile"
            );


        const submitButton =
            document.getElementById(
                "submitImportAsset"
            );


        const resultBox =
            document.getElementById(
                "assetImportResult"
            );


        const fileInfo =
            document.getElementById(
                "assetImportFileInfo"
            );


        function closeModal() {

            modal.remove();

        }


        closeButton.addEventListener(
            "click",
            closeModal
        );


        cancelButton.addEventListener(
            "click",
            closeModal
        );


        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    closeModal();

                }

            }
        );


        fileInput.addEventListener(
            "change",
            () => {

                const file =
                    fileInput.files[0];


                resultBox.style.display =
                    "none";


                if (!file) {

                    submitButton.disabled =
                        true;


                    fileInfo.style.display =
                        "none";


                    return;

                }


                const fileName =
                    file.name.toLowerCase();


                const allowed =
                    fileName.endsWith(".xlsx") ||
                    fileName.endsWith(".xls") ||
                    fileName.endsWith(".csv");


                if (!allowed) {

                    submitButton.disabled =
                        true;


                    fileInfo.style.display =
                        "block";


                    fileInfo.style.color =
                        "#dc2626";


                    fileInfo.textContent =
                        "Invalid file. Please select an Excel or CSV file.";


                    return;

                }


                if (
                    file.size >
                    10 * 1024 * 1024
                ) {

                    submitButton.disabled =
                        true;


                    fileInfo.style.display =
                        "block";


                    fileInfo.style.color =
                        "#dc2626";


                    fileInfo.textContent =
                        "File is too large. Maximum size is 10 MB.";


                    return;

                }


                fileInfo.style.display =
                    "block";


                fileInfo.style.color =
                    "#374151";


                fileInfo.innerHTML = `

                <strong>
                    Selected File:
                </strong>

                ${escapeHTML(file.name)}

                <br>

                <span
                    style="
                        color:#6b7280;
                    "
                >
                    Size:
                    ${(
                        file.size /
                        1024
                    ).toFixed(1)
                    }
                    KB
                </span>

            `;


                submitButton.disabled =
                    false;

            }
        );


        submitButton.addEventListener(
            "click",
            async () => {

                const file =
                    fileInput.files[0];


                if (!file) {

                    return;

                }


                const formData =
                    new FormData();


                formData.append(
                    "file",
                    file
                );


                submitButton.disabled =
                    true;


                submitButton.textContent =
                    "Importing...";


                resultBox.style.display =
                    "none";


                try {

                    const response =
                        await fetch(
                            "/api/assets/import",
                            {

                                method:
                                    "POST",

                                body:
                                    formData

                            }
                        );


                    const data =
                        await response.json();


                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        throw new Error(
                            data.message ||
                            "Unable to import assets."
                        );

                    }


                    const summary =
                        data.summary ||
                        {};


                    resultBox.style.display =
                        "block";


                    resultBox.style.background =
                        "#ecfdf5";


                    resultBox.style.border =
                        "1px solid #a7f3d0";


                    resultBox.style.color =
                        "#065f46";


                    resultBox.innerHTML = `

                    <strong>
                        Import Completed
                    </strong>

                    <div
                        style="
                            margin-top:10px;
                            line-height:1.8;
                        "
                    >

                        Total Rows:
                        <strong>
                            ${summary.total || 0}
                        </strong>

                        <br>

                        Imported:
                        <strong>
                            ${summary.imported || 0}
                        </strong>

                        <br>

                        Skipped:
                        <strong>
                            ${summary.skipped || 0}
                        </strong>

                        <br>

                        Invalid:
                        <strong>
                            ${summary.invalid || 0}
                        </strong>

                    </div>

                `;


                    await loadAssets();


                    submitButton.textContent =
                        "Import Completed";


                    setTimeout(
                        closeModal,
                        1800
                    );

                }

                catch (error) {

                    console.error(
                        "Asset import error:",
                        error
                    );


                    resultBox.style.display =
                        "block";


                    resultBox.style.background =
                        "#fef2f2";


                    resultBox.style.border =
                        "1px solid #fecaca";


                    resultBox.style.color =
                        "#991b1b";


                    resultBox.textContent =
                        error.message ||
                        "Unable to import assets.";


                    submitButton.disabled =
                        false;


                    submitButton.textContent =
                        "Import Assets";

                }

            }
        );


        window.openImportAssets =
            function () {

                modal.style.display =
                    "flex";

            };


        window.openImportAssets();

    }


    // ============================================================
    // CHANGE EXPORT BUTTON TO IMPORT ASSETS
    // ============================================================

    const exportButton =
        document.querySelector(
            ".table-header .secondary-btn"
        );


    if (exportButton) {

        exportButton.textContent =
            "↑ Import Assets";


        exportButton.addEventListener(
            "click",
            () => {

                createImportModal();

            }
        );

    }


    // ========================================================
    // INITIAL LOAD
    // ========================================================

    loadAssets();

});﻿
// ===== Row click opens View =====
document.addEventListener("click", function (e) {
    // Ignore clicks on buttons, links, inputs and the Action dropdown
    if (e.target.closest("button, a, input, select, label, .action-dropdown, .action-menu")) return;

    const row = e.target.closest("tbody tr");
    if (!row) return;

    const viewBtn = row.querySelector('[data-action="view"]');
    if (viewBtn) viewBtn.click();
});
