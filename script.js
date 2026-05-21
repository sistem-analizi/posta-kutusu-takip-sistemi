const firebaseConfig = {
    apiKey: "AIzaSyDg7BrMAuANnsiepZF4iDpeuTsKpmNMqW8",
    databaseURL: "https://esp32a-5cf45-default-rtdb.europe-west1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
let aktifGorev = null; 

// --- GİRİŞ VE YETKİ ---
function girisYap() {
    auth.signInWithEmailAndPassword(document.getElementById("emailInp").value, document.getElementById("passInp").value)
        .catch(e => document.getElementById("hataMesaji").innerText = e.message);
}

function kayitOl() {
    const email = document.getElementById("emailInp").value;
    const pass = document.getElementById("passInp").value;
    const device = document.getElementById("deviceInp").value;
    if(!device) { document.getElementById("hataMesaji").innerText = "Lütfen Cihaz Kodunu girin!"; return; }

    auth.createUserWithEmailAndPassword(email, pass).then(userCredential => {
        db.ref('/Kullanicilar/' + userCredential.user.uid).set({ email: email, rol: "user", bagliCihaz: device });
    }).catch(e => document.getElementById("hataMesaji").innerText = e.message);
}

function cikisYap() { auth.signOut(); }

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("mainPanel").style.display = "block";
        document.getElementById("kullaniciMail").innerText = user.email;
        db.ref('/Kullanicilar/' + user.uid).once('value').then(snapshot => paneliYukle(snapshot.val()));
    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("mainPanel").style.display = "none";
        if (aktifGorev) db.ref(aktifGorev).off(); 
    }
});

function paneliYukle(profil) {
    if(!profil) return;
    const badge = document.getElementById("roleBadge");
    
    if (profil.rol === "admin") {
        badge.className = "badge badge-admin"; badge.innerHTML = "<i class='fa-solid fa-crown'></i> YÖNETİCİ";
        aktifGorev = '/Cihazlar';
        db.ref('/Cihazlar').on('value', snapshot => ekranaBas(snapshot.val()));
    } else {
        badge.className = "badge badge-user"; badge.innerHTML = "<i class='fa-solid fa-user'></i> KULLANICI";
        aktifGorev = '/Cihazlar/' + profil.bagliCihaz;
        db.ref(aktifGorev).on('value', snapshot => {
            let data = {}; data[profil.bagliCihaz] = snapshot.val();
            ekranaBas(data); 
        });
    }
}

// --- EKRANA BASMA VE HTML OLUŞTURMA ---
function ekranaBas(cihazlar) {
    const container = document.getElementById("devicesContainer");
    container.innerHTML = ""; 

    if (!cihazlar) {
        container.innerHTML = "<div class='loading-box'><i class='fa-solid fa-triangle-exclamation'></i><h3>Henüz veri yok.</h3></div>";
        return;
    }

    for (const [cihazID, data] of Object.entries(cihazlar)) {
        
        // 1. LOGLAR
        let logHTML = "<div style='color:#94a3b8; padding:10px;'>Kayıt bulunamadı.</div>";
        if (data && data.KayitDefteri) {
            const logListesi = Object.values(data.KayitDefteri).reverse();
            logHTML = logListesi.map(item => {
                let okunabilirSaat = "";
                if(item.zaman) {
                    const t = new Date(item.zaman);
                    okunabilirSaat = t.toLocaleDateString('tr-TR') + " " + t.toLocaleTimeString('tr-TR'); 
                }
                
                let ikon = "fa-info", renkKodu = "id-4";
                if(item.id == 1) { ikon = "fa-envelope"; renkKodu = "id-1"; }
                if(item.id == 2) { ikon = "fa-unlock"; renkKodu = "id-2"; }
                if(item.id == 3) { ikon = "fa-triangle-exclamation"; renkKodu = "id-3"; }

                return `
                <div class='log-item ${renkKodu}' data-timestamp='${item.zaman}'>
                    <div class="log-icon"><i class="fa-solid ${ikon}"></i></div>
                    <div>
                        <small style="color: #94a3b8;">${okunabilirSaat}</small><br>
                        <span style="color: white; font-weight: 500;">${item.olay}</span>
                    </div>
                </div>`;
            }).join("");
        }

        // 2. DİNAMİK KULLANICILAR VE FİLTRE MENÜSÜ
        let kullaniciHTML = "";
        let kullaniciOptionsHTML = `<option value="all">Tüm Kişiler</option>`;
        
        let sifreListesi = data.SifreListesi || "";
        if (sifreListesi.trim() !== "") {
            let users = sifreListesi.split(",").filter(u => u !== ""); 
            users.forEach(u => {
                let parts = u.split("=");
                let pin = parts[0]; let isim = parts[1];
                
                kullaniciOptionsHTML += `<option value="${isim}">${isim}</option>`;

                kullaniciHTML += `
                <div style="background:#f1f5f9; padding:15px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border: 1px solid #cbd5e1; flex-wrap: wrap; gap: 10px;">
                    <div><b><i class="fa-solid fa-user-check"></i> ${isim}</b> <br> <small style="color:var(--gray);">Şifre: ${pin}</small></div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn" style="background:var(--warning); padding:8px 15px; width:auto; margin-top:0;" onclick="sifreDegistir('${cihazID}', '${pin}', '${isim}')"><i class="fa-solid fa-pen-to-square"></i> Değiştir</button>
                        <button class="btn" style="background:var(--danger); padding:8px 15px; width:auto; margin-top:0;" onclick="kullaniciSil('${cihazID}', '${pin}', '${isim}')"><i class="fa-solid fa-trash"></i> Sil</button>
                    </div>
                </div>`;
            });
            kullaniciOptionsHTML += `<option value="Bilinmeyen">Bilinmeyen Kişiler</option>`;
        } else {
            kullaniciHTML = "<p style='color:var(--gray);'>Sistemde henüz kayıtlı kullanıcı yok.</p>";
        }

        const kapakDurumu = data.KutuDurumu === 'Acik' ? '<span style="color:var(--danger);"><i class="fa-solid fa-door-open"></i> AÇIK</span>' : '<span style="color:var(--success);"><i class="fa-solid fa-door-closed"></i> KAPALI</span>';
        
        // 3. KART HTML (KİŞİ FİLTRESİ GERİ EKLENDİ)
        const kart = `
            <div class="device-card" id="kutu-${cihazID}">
                <div class="device-header">
                    <h2><i class="fa-solid fa-microchip"></i> Cihaz: ${cihazID}</h2>
                    <div>Kapak: <strong>${kapakDurumu}</strong></div>
                </div>
                
                <div class="tab-menu">
                    <button class="tab-btn active" onclick="sekmeAc(event, 'tab-posta-${cihazID}', '${cihazID}')"><i class="fa-solid fa-envelope-open-text"></i> Gelen Postalar</button>
                    <button class="tab-btn" onclick="sekmeAc(event, 'tab-guvenlik-${cihazID}', '${cihazID}')"><i class="fa-solid fa-users-gear"></i> Kullanıcı Yönetimi</button>
                    <button class="tab-btn" onclick="sekmeAc(event, 'tab-gecmis-${cihazID}', '${cihazID}')"><i class="fa-solid fa-clipboard-list"></i> İşlem Kayıtları</button>
                </div>

                <div id="tab-posta-${cihazID}" class="tab-content active">
                    <div class="mail-count-box">
                        <p>Kutudaki Toplam Mektup</p>
                        <h1>${data.MektupSayisi || 0}</h1>
                        <button class="btn btn-reset" style="margin-top:20px;" onclick="sayaciSifirla('${cihazID}')"><i class="fa-solid fa-trash-can"></i> Kutuyu Boşalt</button>
                    </div>
                </div>

                <div id="tab-guvenlik-${cihazID}" class="tab-content">
                    <button class="btn" style="background:var(--success); margin-bottom:20px;" onclick="yeniKullaniciEkle('${cihazID}')"><i class="fa-solid fa-user-plus"></i> Yeni Kullanıcı Ekle</button>
                    <div id="kullaniciListesiContainer">${kullaniciHTML}</div>
                </div>

                <div id="tab-gecmis-${cihazID}" class="tab-content">
                    
                    <div class="filter-bar">
                        <label><b>Olay Türü:</b></label>
                        <select id="type-${cihazID}" class="filter-select">
                            <option value="all">Tüm Olaylar</option>
                            <option value="id-1">📩 Posta Geldi</option>
                            <option value="id-2">🔓 Kapı Açıldı</option>
                            <option value="id-3">❌ Hatalı Şifreler</option>
                            <option value="id-4">⚙️ Sistem Uyarıları</option>
                        </select>
                        
                        <label><b>Kişi:</b></label>
                        <select id="userFilter-${cihazID}" class="filter-select">
                            ${kullaniciOptionsHTML}
                        </select>
                        
                        <label><b>Başlangıç:</b></label> <input type="datetime-local" id="start-${cihazID}">
                        <label><b>Bitiş:</b></label> <input type="datetime-local" id="end-${cihazID}">
                        
                        <button class="btn-filter" onclick="gelismisFiltrele('${cihazID}')"><i class="fa-solid fa-filter"></i> Filtrele</button>
                        <button class="btn-filter" style="background:var(--gray);" onclick="filtreSifirla('${cihazID}')">Sıfırla</button>
                    </div>

                    <button class="btn" style="background: var(--danger); margin-bottom: 15px;" onclick="gecmisiTemizle('${cihazID}')">
                        <i class="fa-solid fa-dumpster-fire"></i> Tüm Geçmişi Temizle
                    </button>
                    
                    <div class="log-box" id="log-container-${cihazID}">${logHTML}</div>
                </div>
            </div>
        `;
        container.innerHTML += kart;
    }
}

function sekmeAc(evt, sekmeID, cihazID) {
    const parentCard = document.getElementById('kutu-' + cihazID);
    const contents = parentCard.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) { contents[i].classList.remove("active"); }
    const links = parentCard.getElementsByClassName("tab-btn");
    for (let i = 0; i < links.length; i++) { links[i].classList.remove("active"); }
    document.getElementById(sekmeID).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// --- DİNAMİK KULLANICI FONKSİYONLARI ---
function yeniKullaniciEkle(cihazID) {
    const isim = prompt("Kullanıcının Adı Nedir? (Örn: Ahmet, Kurye)");
    if(!isim) return;
    const sifre = prompt(isim + " için 4 haneli şifre belirleyin:");
    if(!sifre || sifre.length !== 4) return alert("Hata: Şifre tam 4 haneli olmalıdır!");

    db.ref('/Cihazlar/' + cihazID + '/SifreListesi').once('value').then(snap => {
        let mevcutListe = snap.val() || "";
        db.ref('/Cihazlar/' + cihazID + '/SifreListesi').set(mevcutListe + sifre + "=" + isim + ",");
    });
}

// YENİ: KURŞUN GEÇİRMEZ ŞİFRE DEĞİŞTİRME
function sifreDegistir(cihazID, eskiPin, isim) {
    const yeniPin = prompt(`${isim} isimli kullanıcı için YENİ 4 haneli şifreyi girin:\n(Mevcut Şifre: ${eskiPin})`);
    if (!yeniPin) return; 
    if (yeniPin.length !== 4 || isNaN(yeniPin)) return alert("Hata: Yeni şifre tam 4 haneli bir sayı olmalıdır!");

    db.ref('/Cihazlar/' + cihazID + '/SifreListesi').once('value').then(snap => {
        let mevcutListe = snap.val() || "";
        if (mevcutListe.includes(`${yeniPin}=`)) return alert("Güvenlik İhlali: Bu şifre zaten başka bir kullanıcı tarafından kullanılıyor!");
        
        // Parçalayıp değiştiriyoruz (Virgül hatasına karşı korumalı)
        let users = mevcutListe.split(",").filter(u => u !== "");
        let yeniUsers = users.map(u => u === `${eskiPin}=${isim}` ? `${yeniPin}=${isim}` : u);
        
        db.ref('/Cihazlar/' + cihazID + '/SifreListesi').set(yeniUsers.join(",") + ",");
        alert(`${isim} adlı kullanıcının şifresi güncellendi!`);
    });
}

// YENİ: KURŞUN GEÇİRMEZ SİLME FONKSİYONU
function kullaniciSil(cihazID, pin, isim) {
    if(confirm(`${isim} adlı kullanıcıyı sistemden silmek istediğinize emin misiniz?`)) {
        db.ref('/Cihazlar/' + cihazID + '/SifreListesi').once('value').then(snap => {
            let mevcutListe = snap.val() || "";
            
            // Listeyi parçala, silinecek kişiyi dışarıda bırak ve tekrar birleştir
            let users = mevcutListe.split(",").filter(u => u !== "" && u !== `${pin}=${isim}`);
            let yeniListe = users.length > 0 ? users.join(",") + "," : "";
            
            db.ref('/Cihazlar/' + cihazID + '/SifreListesi').set(yeniListe);
        });
    }
}

// --- GELİŞMİŞ FİLTRELEME (KİŞİ + ID + TARİH/SAAT) ---
function gelismisFiltrele(cihazID) {
    const typeInput = document.getElementById(`type-${cihazID}`).value;
    const userInput = document.getElementById(`userFilter-${cihazID}`).value; 
    const startInput = document.getElementById(`start-${cihazID}`).value;
    const endInput = document.getElementById(`end-${cihazID}`).value;

    const zamanKullan = (startInput && endInput);
    const startTimestamp = zamanKullan ? new Date(startInput).getTime() : 0;
    const endTimestamp = zamanKullan ? new Date(endInput).getTime() : 0;

    if(!zamanKullan && typeInput === "all" && userInput === "all") { 
        return alert("Lütfen aramak için bir tarih, olay türü veya kişi seçin!"); 
    }

    document.querySelectorAll(`#log-container-${cihazID} .log-item`).forEach(satir => {
        const islemZamani = parseInt(satir.getAttribute('data-timestamp'));
        const logMetni = satir.querySelector('span').innerText; 
        
        let zamanUyuyor = true;
        let tipUyuyor = true;
        let kisiUyuyor = true;

        if(zamanKullan) zamanUyuyor = (islemZamani >= startTimestamp && islemZamani <= endTimestamp);
        if(typeInput !== "all") tipUyuyor = satir.classList.contains(typeInput); 
        if(userInput !== "all") kisiUyuyor = logMetni.includes(userInput); 

        satir.style.display = (zamanUyuyor && tipUyuyor && kisiUyuyor) ? "flex" : "none";
    });
}

function filtreSifirla(cihazID) {
    document.querySelectorAll(`#log-container-${cihazID} .log-item`).forEach(satir => satir.style.display = "flex"); 
    document.getElementById(`type-${cihazID}`).value = "all";
    document.getElementById(`userFilter-${cihazID}`).value = "all"; 
    document.getElementById(`start-${cihazID}`).value = "";
    document.getElementById(`end-${cihazID}`).value = "";
}

function sayaciSifirla(cihazID) { if(confirm("Emin misiniz?")) db.ref('/Cihazlar/' + cihazID + '/MektupSayisi').set(0); }
function gecmisiTemizle(cihazID) { if(confirm("Tüm geçmiş silinecek!")) db.ref('/Cihazlar/' + cihazID + '/KayitDefteri').remove(); }