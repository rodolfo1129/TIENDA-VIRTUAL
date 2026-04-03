let db = []; 
let cart = [];
let tempImages = [];

function navegar(seccion) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById('vista-' + seccion).style.display = 'block';
    if(seccion === 'tienda') renderTienda();
    if(seccion === 'admin') renderAdmin();
    if(seccion === 'carrito') renderCarrito();
}

// MANEJO DE IMÁGENES
document.getElementById('file-input').addEventListener('change', async function(e) {
    const previewContainer = document.getElementById('file-previews');
    previewContainer.innerHTML = ""; 
    tempImages = []; 
    
    const archivos = Array.from(e.target.files);
    for (const file of archivos) {
        const reader = new FileReader();
        const base64 = await new Promise(resolve => {
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
        });
        tempImages.push(base64);
        const img = document.createElement('img');
        img.src = base64;
        img.className = 'preview-thumb';
        previewContainer.appendChild(img);
    }
});

// GUARDAR / EDITAR PRODUCTO
document.getElementById('product-form').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    
    const data = {
        name: document.getElementById('name').value,
        price: parseFloat(document.getElementById('price').value),
        stock: parseInt(document.getElementById('stock').value),
        desc: document.getElementById('desc').value
    };

    if(id) {
        const idx = db.findIndex(p => p.id == id);
        data.imgs = tempImages.length >= 3 ? [...tempImages] : db[idx].imgs;
        db[idx] = { ...db[idx], ...data };
        alert("Producto actualizado");
    } else {
        if(tempImages.length < 3) return alert("Error: Selecciona al menos 3 imágenes.");
        db.push({ id: Date.now(), ...data, imgs: [...tempImages] });
        alert("Producto guardado");
    }

    resetForm();
    renderAdmin();
};

function resetForm() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('file-previews').innerHTML = "";
    document.getElementById('form-title').innerText = "Gestión de Inventario";
    document.getElementById('save-btn').innerText = "GUARDAR PRODUCTO";
    document.getElementById('cancel-btn').style.display = "none";
    tempImages = [];
}

// RENDER ADMIN CON BOTÓN EDITAR (Restaurado)
function renderAdmin() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = db.map(p => `
        <tr>
            <td>#${p.id.toString().slice(-4)}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.stock}</td>
            <td>
                <button onclick="editProduct(${p.id})" style="color:var(--teal); background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:12px;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteProduct(${p.id})" style="color:red; background:none; border:none; cursor:pointer; font-size:1.1rem;"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function editProduct(id) {
    const p = db.find(x => x.id === id);
    document.getElementById('edit-id').value = p.id;
    document.getElementById('name').value = p.name;
    document.getElementById('price').value = p.price;
    document.getElementById('stock').value = p.stock;
    document.getElementById('desc').value = p.desc;
    document.getElementById('form-title').innerText = "Editando: " + p.name;
    document.getElementById('save-btn').innerText = "ACTUALIZAR CAMBIOS";
    document.getElementById('cancel-btn').style.display = "block";
    navegar('admin');
}

function deleteProduct(id) {
    if(confirm("¿Eliminar producto?")) {
        db = db.filter(p => p.id !== id);
        renderAdmin();
    }
}

// TIENDA Y DETALLE
function renderTienda() {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = db.length === 0 ? '<p>No hay equipos registrados.</p>' : db.map(p => `
        <div class="card">
            <img src="${p.imgs[0]}" onclick="verDetalle(${p.id})">
            <h3>${p.name}</h3>
            <p style="color:var(--teal); font-weight:bold; margin:10px 0;">$${p.price.toLocaleString()}</p>
            <button onclick="addToCart(${p.id})" class="btn-primary" style="padding:10px; font-size:0.8rem">AGREGAR AL CARRITO</button>
        </div>
    `).join('');
}

function verDetalle(id) {
    const p = db.find(x => x.id === id);
    navegar('detalle');
    document.getElementById('det-name').innerText = p.name;
    document.getElementById('det-price').innerText = `$${p.price.toLocaleString()}`;
    document.getElementById('det-desc').innerText = p.desc;
    document.getElementById('main-img').src = p.imgs[0];
    document.getElementById('thumb-container').innerHTML = p.imgs.map(img => `
        <img src="${img}" class="thumb" onclick="document.getElementById('main-img').src='${img}'">
    `).join('');
    document.getElementById('add-to-cart-btn-det').onclick = () => addToCart(p.id);
}

// CARRITO
function addToCart(id) {
    const p = db.find(x => x.id === id);
    const item = cart.find(x => x.id === id);
    if(item) item.qty++; else cart.push({...p, qty: 1});
    document.getElementById('cart-count').innerText = cart.reduce((a, b) => a + b.qty, 0);
    alert("Agregado al carrito");
}

function renderCarrito() {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    if(cart.length === 0) {
        list.innerHTML = '<tr><td colspan="5" style="text-align:center">Carrito vacío</td></tr>';
        totalEl.innerText = "$0";
        return;
    }
    list.innerHTML = cart.map(item => `
        <tr>
            <td><img src="${item.imgs[0]}" style="width:50px; height:50px; object-fit:contain;"></td>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>$${(item.price * item.qty).toLocaleString()}</td>
            <td><button onclick="cart=cart.filter(i=>i.id!==${item.id}); renderCarrito();" style="color:red; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
    totalEl.innerText = "$" + cart.reduce((acc, b) => acc + (b.price * b.qty), 0).toLocaleString();
}

navegar('tienda');

// --- FUNCIÓN DEL BUSCADOR ---
function filtrarProductos() {
    const texto = document.getElementById('input-busqueda').value.toLowerCase();
    const productos = document.querySelectorAll('#grid-productos .card');

    productos.forEach(card => {
        const nombre = card.querySelector('h3').innerText.toLowerCase();
        if (nombre.includes(texto)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

// --- CONTROL DEL SIDEBAR ---
let sidebarOpen = false;

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebarOpen) {
        sidebar.style.width = "300px";
        sidebarOpen = true;
    } else {
        sidebar.style.width = "0";
        sidebarOpen = false;
    }
}
