// ============================================================
// ROF ASSET MANAGEMENT
// DASHBOARD.JS
// ============================================================


// ============================================================
// GLOBAL DASHBOARD DATA
// ============================================================

let dashboardAssets = [];

let dashboardCounts = {
    total: 0,
    available: 0,
    assigned: 0,
    repair: 0,
    retired: 0
};


// ============================================================
// LOAD DASHBOARD
// ============================================================

async function loadDashboard() {

    try {

        const response =
            await fetch("/api/assets");


        if (!response.ok) {

            throw new Error(
                "Unable to load assets."
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            console.error(
                "Dashboard:",
                data.message
            );

            return;

        }


        // =====================================================
        // STORE ASSETS
        // =====================================================

        dashboardAssets =
            Array.isArray(data.assets)
                ? data.assets
                : [];


        // =====================================================
        // CALCULATE STATUS COUNTS
        // =====================================================

        const total =
            dashboardAssets.length;


        const available =
            dashboardAssets.filter(
                function (asset) {

                    return asset.status === "Available";

                }
            ).length;


        const assigned =
            dashboardAssets.filter(
                function (asset) {

                    return asset.status === "Assigned";

                }
            ).length;


        const repair =
            dashboardAssets.filter(
                function (asset) {

                    return asset.status === "Under Repair";

                }
            ).length;


        const retired =
            dashboardAssets.filter(
                function (asset) {

                    return asset.status === "Retired";

                }
            ).length;


        // =====================================================
        // SAVE COUNTS
        // =====================================================

        dashboardCounts = {

            total: total,

            available: available,

            assigned: assigned,

            repair: repair,

            retired: retired

        };


        // =====================================================
        // UPDATE SUMMARY CARDS
        // =====================================================

        setDashboardValue(
            "totalAssets",
            total
        );


        setDashboardValue(
            "availableAssets",
            available
        );


        setDashboardValue(
            "assignedAssets",
            assigned
        );


        setDashboardValue(
            "repairAssets",
            repair
        );


        setDashboardValue(
            "retiredAssets",
            retired
        );


        // =====================================================
        // UPDATE STATUS CHART
        // =====================================================

        updateStatusSection();


        // =====================================================
        // UPDATE ASSET TYPES
        // =====================================================

        updateAssetTypes();

    }

    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

}


// ============================================================
// SET DASHBOARD VALUE
// ============================================================

function setDashboardValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


// ============================================================
// UPDATE STATUS SECTION
// ============================================================

function updateStatusSection() {

    const total =
        dashboardCounts.total;


    const available =
        dashboardCounts.available;


    const assigned =
        dashboardCounts.assigned;


    const repair =
        dashboardCounts.repair;


    const retired =
        dashboardCounts.retired;


    // ========================================================
    // UPDATE CENTER TOTAL
    // ========================================================

    const chartTotal =
        document.getElementById(
            "chartTotal"
        );


    if (chartTotal) {

        chartTotal.textContent =
            total;

    }


    // ========================================================
    // OLD STATUS CIRCLE SUPPORT
    // ========================================================

    const statusCircle =
        document.querySelector(
            ".status-circle strong"
        );


    if (statusCircle) {

        statusCircle.textContent =
            total;

    }


    // ========================================================
    // OLD STATUS ROW SUPPORT
    // ========================================================

    const statusRows =
        document.querySelectorAll(
            ".status-row"
        );


    statusRows.forEach(
        function (row) {

            const label =
                row.querySelector(
                    "span"
                );


            const value =
                row.querySelector(
                    "strong"
                );


            if (!label || !value) {

                return;

            }


            const text =
                label.textContent
                    .trim()
                    .toLowerCase();


            if (
                text.includes(
                    "available"
                )
            ) {

                value.textContent =
                    available;

            }


            else if (
                text.includes(
                    "assigned"
                )
            ) {

                value.textContent =
                    assigned;

            }


            else if (
                text.includes(
                    "under repair"
                )
            ) {

                value.textContent =
                    repair;

            }


            else if (
                text.includes(
                    "retired"
                )
            ) {

                value.textContent =
                    retired;

            }

        }
    );


    // ========================================================
    // DONUT ELEMENT
    // ========================================================

    const donut =
        document.getElementById(
            "statusDonut"
        );


    const legend =
        document.getElementById(
            "statusLegend"
        );


    if (!donut) {

        console.warn(
            "statusDonut element not found."
        );

        return;

    }


    // ========================================================
    // STATUS COLORS
    // ========================================================

    const colors = {

        available: "#22c55e",

        assigned: "#3b82f6",

        repair: "#f59e0b",

        retired: "#94a3b8"

    };


    // ========================================================
    // STATUS DATA
    // ========================================================

    const statusData = [

        {
            name: "Available",
            value: available,
            className: "available",
            color: colors.available
        },


        {
            name: "Assigned",
            value: assigned,
            className: "assigned",
            color: colors.assigned
        },


        {
            name: "Under Repair",
            value: repair,
            className: "repair",
            color: colors.repair
        },


        {
            name: "Retired",
            value: retired,
            className: "retired",
            color: colors.retired
        }

    ];


    // ========================================================
    // CREATE DONUT
    // ========================================================

    if (total <= 0) {

        donut.style.background =
            "#e5e7eb";

    }

    else {

        let currentPercentage =
            0;


        const gradientParts =
            [];


        statusData.forEach(
            function (item) {

                if (item.value <= 0) {

                    return;

                }


                const percentage =
                    (
                        item.value /
                        total
                    ) * 100;


                const start =
                    currentPercentage;


                const end =
                    currentPercentage +
                    percentage;


                gradientParts.push(

                    `${item.color} ${start}% ${end}%`

                );


                currentPercentage =
                    end;

            }
        );


        donut.style.background =
            `conic-gradient(${gradientParts.join(", ")})`;

    }


    // ========================================================
    // CREATE LEGEND
    // ========================================================

    if (!legend) {

        return;

    }


    legend.innerHTML =
        "";


    statusData.forEach(
        function (item) {

            const percentage =
                total > 0

                    ? (
                        item.value /
                        total *
                        100
                    )

                    : 0;


            const row =
                document.createElement(
                    "div"
                );


            // IMPORTANT:
            // These classes match the reference CSS.

            row.className =
                "legend-row";


            row.innerHTML = `

                <div class="legend-name">

                    <span
                        class="legend-dot ${item.className}">
                    </span>

                    <span>
                        ${item.name}
                    </span>

                </div>


                <strong>

                    ${item.value}

                    <small style="
                        margin-left: 8px;
                        color: #94a3b8;
                        font-size: 11px;
                        font-weight: 500;
                    ">
                        ${percentage.toFixed(1)}%
                    </small>

                </strong>

            `;


            legend.appendChild(
                row
            );

        }
    );

}


// ============================================================
// ASSET TYPE ICON
// ============================================================

function getAssetTypeIcon(type) {

    const name =
        String(type)
            .toLowerCase()
            .trim();


    if (
        name.includes("laptop") ||
        name.includes("notebook")
    ) {

        return "💻";

    }


    if (
        name.includes("desktop") ||
        name.includes("computer")
    ) {

        return "🖥️";

    }


    if (
        name.includes("printer")
    ) {

        return "🖨️";

    }


    if (
        name.includes("monitor") ||
        name.includes("display")
    ) {

        return "🖥️";

    }


    if (
        name.includes("mobile") ||
        name.includes("phone")
    ) {

        return "📱";

    }


    if (
        name.includes("tablet")
    ) {

        return "📱";

    }


    if (
        name.includes("keyboard")
    ) {

        return "⌨️";

    }


    if (
        name.includes("mouse")
    ) {

        return "🖱️";

    }


    if (
        name.includes("network") ||
        name.includes("switch") ||
        name.includes("router") ||
        name.includes("access point") ||
        name.includes("wifi")
    ) {

        return "📡";

    }


    if (
        name.includes("ups") ||
        name.includes("power") ||
        name.includes("adapter")
    ) {

        return "🔌";

    }


    if (
        name.includes("server") ||
        name.includes("storage")
    ) {

        return "🗄️";

    }


    if (
        name.includes("scanner") ||
        name.includes("scan")
    ) {

        return "📠";

    }


    if (
        name.includes("projector")
    ) {

        return "📽️";

    }


    if (
        name.includes("camera") ||
        name.includes("cctv")
    ) {

        return "📷";

    }


    if (
        name.includes("telephone") ||
        name.includes("landline")
    ) {

        return "☎️";

    }


    return "📦";

}


// ============================================================
// ASSET TYPE COLORS
// ============================================================

function getAssetTypeColor(index) {

    const colors = [

        "#3b82f6",

        "#8b5cf6",

        "#f59e0b",

        "#10b981",

        "#06b6d4",

        "#6366f1",

        "#ef4444",

        "#14b8a6",

        "#f97316",

        "#ec4899"

    ];


    return colors[
        index %
        colors.length
    ];

}


// ============================================================
// GET ASSET TYPE
// ============================================================

function getAssetType(asset) {

    const possibleTypes = [

        asset.asset_type,

        asset.assetType,

        asset.AssetType,

        asset["Asset Type"],

        asset.type,

        asset.category,

        asset.Category

    ];


    for (
        let i = 0;
        i < possibleTypes.length;
        i++
    ) {

        const value =
            possibleTypes[i];


        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {

            return String(value).trim();

        }

    }


    return "Other";

}


// ============================================================
// UPDATE ASSET TYPES
// ============================================================

function updateAssetTypes() {

    // ========================================================
    // FIND CONTAINER
    // ========================================================

    const container =

        document.getElementById(
            "assetTypesList"
        ) ||

        document.querySelector(
            ".asset-type-chart"
        ) ||

        document.querySelector(
            ".asset-types-list"
        ) ||

        document.querySelector(
            ".asset-types-content"
        ) ||

        document.querySelector(
            ".asset-types"
        );


    if (!container) {

        console.warn(
            "Asset Types container not found."
        );

        return;

    }


    // ========================================================
    // NO DATA
    // ========================================================

    if (
        !Array.isArray(
            dashboardAssets
        ) ||
        dashboardAssets.length === 0
    ) {

        container.innerHTML = `

            <div class="asset-type-empty">

                No asset data available

            </div>

        `;

        return;

    }


    // ========================================================
    // COUNT TYPES
    // ========================================================

    const typeCounts = {};


    dashboardAssets.forEach(
        function (asset) {

            const type =
                getAssetType(
                    asset
                );


            typeCounts[type] =
                (
                    typeCounts[type] ||
                    0
                ) + 1;

        }
    );


    // ========================================================
    // SORT TYPES
    // ========================================================

    const sortedTypes =

        Object.entries(
            typeCounts
        ).sort(
            function (a, b) {

                return b[1] - a[1];

            }
        );


    const total =
        dashboardAssets.length;


    const maxCount =

        sortedTypes.length > 0

            ? sortedTypes[0][1]

            : 1;


    // ========================================================
    // CLEAR CONTAINER
    // ========================================================

    container.innerHTML =
        "";


    // ========================================================
    // CREATE TYPE ROWS
    // ========================================================

    sortedTypes.forEach(
        function (
            item,
            index
        ) {

            const type =
                item[0];


            const count =
                item[1];


            const percentage =

                total > 0

                    ? (
                        count /
                        total *
                        100
                    )

                    : 0;


            const barWidth =

                maxCount > 0

                    ? (
                        count /
                        maxCount *
                        100
                    )

                    : 0;


            const icon =
                getAssetTypeIcon(
                    type
                );


            const color =
                getAssetTypeColor(
                    index
                );


            // =================================================
            // CREATE ROW
            // =================================================

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "asset-type-row";


            // =================================================
            // ROW CONTENT
            // =================================================

            row.innerHTML = `

                <div class="asset-type-info">

                    <div class="asset-type-title">

                        <span
                            class="asset-type-icon"
                        >
                            ${icon}
                        </span>


                        <span
                            class="asset-type-name"
                            title="${escapeHtml(type)}"
                        >
                            ${escapeHtml(type)}
                        </span>

                    </div>


                    <span
                        class="asset-type-count"
                    >
                        ${count}
                    </span>

                </div>


                <div
                    class="asset-type-bar"
                >

                    <div
                        class="asset-type-progress"
                        style="
                            width: ${Math.max(
                                5,
                                barWidth
                            )}%;
                            background: ${color};
                        "
                    ></div>

                </div>


                <div
                    class="asset-type-percentage"
                >

                    ${percentage.toFixed(1)}%

                </div>

            `;


            container.appendChild(
                row
            );

        }
    );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(value)

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


// ============================================================
// LOAD RECENT ACTIVITY
// ============================================================

async function loadRecentActivity() {

    try {

        const response =
            await fetch(
                "/api/dashboard/activity"
            );


        if (!response.ok) {

            return;

        }


        const data =
            await response.json();


        if (!data.success) {

            return;

        }


        const container =
            document.getElementById(
                "recentActivity"
            );


        if (!container) {

            return;

        }


        // =====================================================
        // CLEAR OLD ACTIVITY
        // =====================================================

        container.innerHTML =
            "";


        // =====================================================
        // NO ACTIVITY
        // =====================================================

        if (
            !Array.isArray(
                data.activities
            ) ||
            data.activities.length === 0
        ) {

            container.innerHTML = `

                <div class="empty-activity">

                    No recent activity.

                </div>

            `;

            return;

        }


        // =====================================================
        // SHOW ACTIVITY
        // =====================================================

        data.activities.forEach(
            function (activity) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "activity-item";


                const activityType =
                    activity.activity_type ||
                    activity.action ||
                    "Activity";


                const description =
                    activity.description ||
                    "";


                const createdAt =
                    activity.created_at ||
                    "";


                item.innerHTML = `

                    <div class="activity-details">

                        <strong>
                            ${escapeHtml(
                                activityType
                            )}
                        </strong>


                        <span>
                            ${escapeHtml(
                                description
                            )}
                        </span>


                        <small>
                            ${escapeHtml(
                                createdAt
                            )}
                        </small>

                    </div>

                `;


                container.appendChild(
                    item
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Recent activity error:",
            error
        );

    }

}


// ============================================================
// REFRESH DASHBOARD
// ============================================================

function refreshDashboardFromAssets() {

    if (
        !Array.isArray(
            dashboardAssets
        )
    ) {

        return;

    }


    const total =
        dashboardAssets.length;


    const available =
        dashboardAssets.filter(
            function (asset) {

                return asset.status === "Available";

            }
        ).length;


    const assigned =
        dashboardAssets.filter(
            function (asset) {

                return asset.status === "Assigned";

            }
        ).length;


    const repair =
        dashboardAssets.filter(
            function (asset) {

                return asset.status === "Under Repair";

            }
        ).length;


    const retired =
        dashboardAssets.filter(
            function (asset) {

                return asset.status === "Retired";

            }
        ).length;


    dashboardCounts = {

        total,

        available,

        assigned,

        repair,

        retired

    };


    // ========================================================
    // UPDATE CARDS
    // ========================================================

    setDashboardValue(
        "totalAssets",
        total
    );


    setDashboardValue(
        "availableAssets",
        available
    );


    setDashboardValue(
        "assignedAssets",
        assigned
    );


    setDashboardValue(
        "repairAssets",
        repair
    );


    setDashboardValue(
        "retiredAssets",
        retired
    );


    // ========================================================
    // UPDATE CHARTS
    // ========================================================

    updateStatusSection();

    updateAssetTypes();

}


// ============================================================
// INITIAL DASHBOARD LOAD
// ============================================================

async function initializeDashboard() {

    await loadDashboard();

    await loadRecentActivity();

}


// ============================================================
// AUTO REFRESH
// ============================================================

setInterval(

    async function () {

        await loadDashboard();

        await loadRecentActivity();

    },

    30000

);


// ============================================================
// START DASHBOARD
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

}

else {

    initializeDashboard();

}