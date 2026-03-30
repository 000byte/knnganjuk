// lokasi_page.js — Logic for SPPG and KOPDES Pages
// const urlAPI = ... removed for Supabase
const dbClient = window.supabaseClient;

let TOPIK = '';
let TOPIK_LABEL = '';
let TOPIK_COLOR = '';
let semuaDataDesa = [];
let dataList = [];
let filteredData = [];

const isLoggedIn = localStorage.getItem('nganjukGis_isLoggedIn') === 'true';
const userRole = localStorage.getItem('nganjukGis_role') || '';

function initLokasi(topik, label, color) {
    TOPIK = topik;
    TOPIK_LABEL = label;
    TOPIK_COLOR = color;

    const isGuest = !isLoggedIn;
    const isAdmin = isLoggedIn && (userRole === 'admin' || userRole === '');
    const isIntel = isLoggedIn && userRole === 'intel';
    const isPidum = isLoggedIn && userRole === 'pidum';
    const isDatun = isLoggedIn && userRole === 'datun';
    const isBidangRole = isIntel || isPidum || isDatun;

    // Redirect ONLY if logged in but not an Admin
    if (isLoggedIn && !isAdmin) {
        window.location.href = 'index.html';
        return;
    }

    // Login status
    if (!isGuest) {
        const el = document.getElementById('login-status');
        if (el) el.classList.remove('hidden');
        const roleLabel = document.getElementById('role-label');
        if (roleLabel) roleLabel.textContent = (userRole === '' ? 'ADMIN' : userRole.toUpperCase());
        const sidebarAdmin = document.getElementById('sidebar-admin-only');
        if (sidebarAdmin) sidebarAdmin.classList.remove('hidden');
    }

    // Hide/Show Sidebar Links
    const baseNav = document.querySelector('aside nav');
    if (baseNav) {
        const sideIntel = baseNav.querySelector('a[href="intel.html"]');
        const sidePidum = baseNav.querySelector('a[href="pidum.html"]');
        const sideDatun = baseNav.querySelector('a[href="datun.html"]');
        const sideSppg = baseNav.querySelector('a[href="sppg.html"]');
        const sideKopdes = baseNav.querySelector('a[href="kopdes.html"]');

        if (sideIntel) sideIntel.classList.toggle('hidden', !(isGuest || isAdmin || isIntel));
        if (sidePidum) sidePidum.classList.toggle('hidden', !(isGuest || isAdmin || isPidum));
        if (sideDatun) sideDatun.classList.toggle('hidden', !(isGuest || isAdmin || isDatun));
        if (sideSppg) sideSppg.classList.toggle('hidden', !(isGuest || isAdmin));
        if (sideKopdes) sideKopdes.classList.toggle('hidden', !(isGuest || isAdmin));

        if (sideSppg && sideSppg.parentElement && sideSppg.parentElement.parentElement) {
            sideSppg.parentElement.parentElement.classList.toggle('hidden', !(isGuest || isAdmin));
        }
        if (sideIntel && sideIntel.parentElement && sideIntel.parentElement.parentElement) {
            sideIntel.parentElement.parentElement.classList.toggle('hidden', !(isGuest || isAdmin || isBidangRole));
        }
    }

    // Init filters
    initFilters();
    loadDesa();
    loadData();
}

async function loadDesa() {
    try {
        const res = await fetch('data/desa_nganjuk.json');
        semuaDataDesa = await res.json();
        
        // Populate Kecamatan Filter
        const selKec = document.getElementById('filter-kecamatan');
        if (selKec) {
            const list = [...new Set(semuaDataDesa.map(d => d.kecamatan))].sort();
            list.forEach(k => selKec.innerHTML += `<option value="${k}">${k}</option>`);
        }
    } catch (e) { console.warn('Desa JSON missing'); }
}

async function loadData() {
    try {
        const { data, error } = await dbClient.from('data_' + TOPIK).select('*');
        if (error) throw error;
        dataList = data || [];
        applyFilter();
    } catch (e) { console.warn('Supabase Error:', e); }
}

function initFilters() {
    const selKec = document.getElementById('filter-kecamatan');
    const selDesa = document.getElementById('filter-desa');
    const selTopik = document.getElementById('filter-topik');

    if (selKec) {
        selKec.addEventListener('change', () => {
            const kec = selKec.value;
            if (selDesa) {
                selDesa.innerHTML = '<option value="">Semua Desa</option>';
                if (!kec) {
                    selDesa.disabled = true;
                } else {
                    selDesa.disabled = false;
                    semuaDataDesa.filter(d => d.kecamatan === kec)
                        .sort((a, b) => a.nama_desa.localeCompare(b.nama_desa))
                        .forEach(d => selDesa.innerHTML += `<option value="${d.nama_desa}">${d.nama_desa}</option>`);
                }
            }
            applyFilter();
        });
    }

    if (selDesa) selDesa.addEventListener('change', applyFilter);
    if (selTopik) {
        selTopik.value = TOPIK;
        selTopik.addEventListener('change', () => {
            if (selTopik.value !== TOPIK) {
                window.location.href = selTopik.value + '.html';
            }
        });
    }
}

function applyFilter() {
    const kec = document.getElementById('filter-kecamatan')?.value || '';
    const desa = document.getElementById('filter-desa')?.value || '';
    
    filteredData = dataList.filter(d => {
        const dKec = d.lokasi_kecamatan || d.kecamatan || '';
        const dDesa = d.lokasi_desa || d.desa || d.alamat || '';
        
        const matchKec = !kec || dKec.toUpperCase().includes(kec.toUpperCase());
        const matchDesa = !desa || dDesa.toUpperCase().includes(desa.toUpperCase());
        
        return matchKec && matchDesa;
    });

    renderTable();
}

function renderTable() {
    const body = document.getElementById('data-body');
    const empty = document.getElementById('empty-state');
    const countEl = document.getElementById('total-count');
    
    if (countEl) countEl.textContent = filteredData.length;

    if (filteredData.length === 0) {
        if (body) body.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    if (body) {
        body.innerHTML = filteredData.map((d, i) => {
            const nama = d.nama_unit || d.nama_kopdes || d.nama || '-';
            const kec = d.lokasi_kecamatan || d.kecamatan || '-';
            const desa = d.lokasi_desa || d.desa || '-';
            const alamat = d.alamat || '-';
            const pj = d.penanggung_jawab || '-';
            const extra = d.sk_ahu ? `<div class="mt-1 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span><span class="text-[10px] font-black text-blue-600 uppercase tracking-tighter">${d.sk_ahu}</span></div>` : '';

            return `<tr class="hover:bg-gray-50 transition border-b border-gray-100 last:border-0">
                <td class="py-4 px-5 text-xs text-gray-400 font-bold">${i + 1}</td>
                <td class="py-4 px-5">
                    <div class="text-sm font-bold text-[#1f2d41]">${nama}</div>
                    ${extra}
                </td>
                <td class="py-4 px-5 text-xs text-emerald-600 font-bold uppercase tracking-tighter">${kec}</td>
                <td class="py-4 px-5 text-xs font-bold text-gray-500">${desa}</td>
                <td class="py-4 px-5 text-xs text-gray-400 max-w-xs truncate" title="${alamat}">${alamat}</td>
                <td class="py-4 px-5 text-xs text-gray-600 font-medium">${pj}</td>
            </tr>`;
        }).join('');
    }

    if (window.lucide) window.lucide.createIcons();
}
