// ============================================================
// ROF ACCESS CONTROL - FRONTEND UI
// Backend remains the final security layer.
// ============================================================

(function () {
    const ALL_PERMISSIONS = [
        "dashboard_view", "asset_view", "asset_create", "asset_edit",
        "asset_delete", "asset_assign", "asset_return", "asset_import",
        "asset_repair", "asset_retire", "report_view", "report_export",
        "backup_restore", "activity_view", "user_management", "settings_view"
    ];

    const state = {
        user: null,
        permissions: new Set(),
        ready: false
    };

    function hasPermission(key) {
        if (!state.user) return false;
        if (state.user.role === "Admin") return true;
        return state.permissions.has(key);
    }

    function hideElement(element) {
        if (element) element.style.display = "none";
    }

    function addLogoutButton() {
        const nav = document.querySelector('.sidebar-nav');
        if (!nav || document.getElementById('rofLogoutBtn')) return;

        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.id = 'rofLogoutBtn';
        logoutLink.className = 'logout-link';
        logoutLink.innerHTML = '↪ &nbsp; Logout';
        logoutLink.title = 'Logout';

        logoutLink.addEventListener('click', async function (event) {
            event.preventDefault();

            if (logoutLink.dataset.loggingOut === '1') return;
            logoutLink.dataset.loggingOut = '1';
            logoutLink.style.pointerEvents = 'none';
            logoutLink.style.opacity = '0.6';

            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    keepalive: true
                });
            } catch (error) {
                console.warn('Logout request failed:', error);
            } finally {
                sessionStorage.removeItem('rof_session_active');
                localStorage.removeItem('rof_remember_username');
                window.location.replace('/login.html');
            }
        });

        nav.appendChild(logoutLink);
    }

    function applyNavigation() {
        addLogoutButton();

        document.querySelectorAll('.sidebar-nav a[href]').forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href.includes('index.html') && !hasPermission('dashboard_view')) hideElement(link);
            if (href.includes('assets.html') && !hasPermission('asset_view')) hideElement(link);
            if (href.includes('reports.html') && !hasPermission('report_view')) hideElement(link);
            if (href.includes('settings.html') && !hasPermission('settings_view')) hideElement(link);
        });

        // Common static action buttons.
        const permissionById = {
            addAssetBtn: 'asset_create',
            assignAssetTopBtn: 'asset_assign',
            importAssetsBtn: 'asset_import',
            backupBtn: 'backup_restore',
            restoreBtn: 'backup_restore',
            exportAssetsBtn: 'report_export',
            exportReportBtn: 'report_export'
        };

        Object.entries(permissionById).forEach(([id, permission]) => {
            if (!hasPermission(permission)) hideElement(document.getElementById(id));
        });

        const userManagementCard = document.getElementById('userManagementCard');
        if (userManagementCard && !hasPermission('user_management')) hideElement(userManagementCard);

        document.querySelectorAll('[data-permission]').forEach(element => {
            const required = element.getAttribute('data-permission');
            if (required && !hasPermission(required)) hideElement(element);
        });
    }

    async function loadAccess() {
        try {
            const isLoginPage = location.pathname.endsWith('/login.html') || location.pathname.endsWith('/forgot-password.html');
            const tabSessionActive = sessionStorage.getItem('rof_session_active') === '1';

            if (!isLoginPage && !tabSessionActive) {
                try { await fetch('/api/auth/logout', { method: 'POST', keepalive: true }); } catch (_) {}
                state.ready = true;
                location.replace('/login.html');
                return state;
            }

            const response = await fetch('/api/auth/me', { cache: 'no-store' });
            if (!response.ok) {
                sessionStorage.removeItem('rof_session_active');
                state.ready = true;
                if (!isLoginPage) location.replace('/login.html');
                return state;
            }

            const data = await response.json();
            state.user = data.user || null;
            state.permissions = new Set((data.user?.role === 'Admin' ? ALL_PERMISSIONS : (data.user?.permissions || [])));
            state.ready = true;
            window.ROF_CURRENT_USER = state.user;
            window.ROF_PERMISSIONS = state.permissions;
            applyNavigation();
        } catch (error) {
            console.error('Access control load error:', error);
            state.ready = true;
        }
        return state;
    }

    window.ROFAccess = {
        state,
        ready: loadAccess(),
        has: hasPermission,
        apply: applyNavigation
    };
})();
