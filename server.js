require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. SERVIR ARCHIVOS ESTÁTICOS ---
app.use(express.static(__dirname));

// --- 2. CONFIGURACIÓN DEL POOL ---
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'TiendaVirtual',
    waitForConnections: true,
    connectionLimit: 10
});

const dbPromise = db.promise();

// --- RUTA: OBTENER PRODUCTOS ---
app.get('/api/productos', (req, res) => {
    const query = 'SELECT * FROM Productos ORDER BY id_producto DESC';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- RUTA: GUARDAR PRODUCTO NUEVO ---
app.post('/api/productos/nuevo', (req, res) => {
    const { nombre, descripcion, precio, stock, imagen_url, categoria } = req.body;
    const query = `INSERT INTO Productos (nombre, descripcion, precio, stock_actual, imagen_url, categoria) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(query, [nombre, descripcion, precio, stock, imagen_url, categoria], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id_producto: result.insertId });
    });
});

// --- RUTA: OBTENER CATEGORIAS ---
app.get('/api/obtener-categorias', (req, res) => {
    db.query("SELECT * FROM categorias", (err, results) => {
        if (err) return res.status(500).send(err.message);
        res.json(results);
    });
});

// --- RUTA MAESTRA: CREAR PEDIDO Y DESCONTAR STOCK ---
app.post('/api/crear-pedido', async (req, res) => {
    const { nombre_cliente, telefono, direccion, email, documento, carrito, total } = req.body;

    // --- ESTA LÍNEA ES LA QUE FALTA EN TU TROZO ---
    // Asegura que si llega un error desde el navegador, el server lo convierta a 0 o al número real
    const totalNumerico = parseFloat(total) || 0;

    if (!carrito || !Array.isArray(carrito)) {
        return res.status(400).json({ success: false, error: "El carrito está vacío o mal formado" });
    }

    const connection = await dbPromise.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Guardar o actualizar cliente
        const sqlCliente = `INSERT INTO clientes (nombre, documento, email, telefono, direccion) 
                            VALUES (?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                            nombre=VALUES(nombre), 
                            telefono=VALUES(telefono), 
                            direccion=VALUES(direccion),
                            email=VALUES(email)`;
        await connection.query(sqlCliente, [nombre_cliente, documento, email, telefono, direccion]);

        // 2. Insertar el pedido (Cambiamos 'total' por 'totalNumerico')
        const [resPedido] = await connection.query(
            "INSERT INTO pedidos (nombre_cliente, documento_cliente, total) VALUES (?, ?, ?)",
            [nombre_cliente, documento, totalNumerico]
        );

        const idPedidoGenerado = resPedido.insertId;
        const codigoUnico = `ARK-${1000 + idPedidoGenerado}`;

        // 3. Asignar código ARK
        await connection.query(
            "UPDATE pedidos SET codigo_pedido = ? WHERE id_pedido = ?",
            [codigoUnico, idPedidoGenerado]
        );
        
        // ... (el resto del código para descontar stock y hacer commit)

        // 4. DESCONTAR STOCK AUTOMÁTICAMENTE
        for (const item of carrito) {
            await connection.query(
                "UPDATE productos SET stock_actual = stock_actual - ? WHERE id_producto = ?",
                [item.cantidad, item.id_producto]
            );
        }

        await connection.commit();
        res.json({ success: true, orden: codigoUnico, id_venta: idPedidoGenerado });

    } catch (error) {
        await connection.rollback();
        console.error("❌ ERROR EN TRANSACCIÓN:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// --- RUTA: OBTENER TODOS LOS PEDIDOS PARA EL ADMINISTRADOR ---
app.get('/api/admin/pedidos', async (req, res) => {
    try {
        // El JOIN es la forma correcta de unir tablas sin duplicar datos
        const query = `
            SELECT 
                p.id_pedido, 
                p.codigo_pedido, 
                p.fecha, 
                p.total, 
                p.estado, 
                c.nombre AS nombre_cliente, 
                c.telefono, 
                c.email, 
                c.direccion 
            FROM pedidos p 
            INNER JOIN clientes c ON p.documento_cliente = c.documento 
            ORDER BY p.fecha DESC
        `;

        // Usamos dbPromise que es el que tienes configurado para async/await
        const [results] = await dbPromise.query(query);
        
        res.json(results);
    } catch (error) {
        console.error("Error en la ruta admin/pedidos:", error);
        res.status(500).json({ 
            success: false, 
            message: "No se pudieron obtener los pedidos",
            error: error.message 
        });
    }
});

// --- LANZAMIENTO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Arktech Store en línea!`);
    console.log(`📡 Servidor: http://localhost:${PORT}`);
    console.log(`📂 Archivos servidos desde: ${__dirname}\n`);
});
