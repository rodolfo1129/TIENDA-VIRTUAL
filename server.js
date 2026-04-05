require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. CONFIGURACIÓN DEL POOL (Asegúrate de que los datos coincidan con tu MySQL)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'TiendaVirtual',
    waitForConnections: true,
    connectionLimit: 10
});

// --- RUTA 1: OBTENER PRODUCTOS ---
app.get('/api/productos', (req, res) => {
    const query = 'SELECT * FROM Productos ORDER BY id_producto DESC';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- RUTA 2: GUARDAR PRODUCTO NUEVO ---
app.post('/api/productos/nuevo', (req, res) => {
    const { nombre, descripcion, precio, stock, imagen_url, categoria } = req.body;
    const query = `INSERT INTO Productos (nombre, descripcion, precio, stock_actual, imagen_url, categoria) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(query, [nombre, descripcion, precio, stock, imagen_url, categoria], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id_producto: result.insertId });
    });
});

// --- RUTA 3: GUARDAR EN CARRITO (CORREGIDA) ---
app.post('/api/carrito/guardar', (req, res) => {
    const { session_id, id_producto, cantidad } = req.body;
    if (!session_id || !id_producto) {
        return res.status(400).json({ error: "Faltan datos (session_id o id_producto)" });
    }
    const query = `
        INSERT INTO Carrito (session_id, id_producto, cantidad) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`;

    db.query(query, [session_id, id_producto, cantidad || 1], (err, result) => {
        if (err) {
            console.error("❌ Error en Carrito:", err.sqlMessage);
            return res.status(500).json({ error: err.sqlMessage });
        }
        res.json({ success: true, message: "Añadido al carrito en BD" });
    });
});

app.post('/api/ventas/nueva', (req, res) => {
    // Extraemos los datos. ¡Ojo que los nombres coincidan con 'ventaData' de arriba!
    const { nombre, documento, email, telefono, direccion, total } = req.body;

    console.log("Dato recibido - Documento:", documento); // Esto saldrá en tu consola negra

    if (!documento) {
        return res.status(400).json({ success: false, error: "El documento es obligatorio" });
    }

    // 1. Guardar Cliente
    const sqlCliente = `INSERT INTO clientes (nombre, documento, email, telefono, direccion) 
                        VALUES (?, ?, ?, ?, ?) 
                        ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)`;

    db.query(sqlCliente, [nombre, documento, email, telefono, direccion], (err, result) => {
        if (err) {
            console.error("❌ Error en SQL Cliente:", err.message);
            return res.status(500).json({ success: false, error: err.message });
        }

        // 2. Guardar Venta
        const sqlVenta = `INSERT INTO ventas (nombre_cliente, documento_cliente, total) VALUES (?, ?, ?)`;
        db.query(sqlVenta, [nombre, documento, total], (errV, resV) => {
            if (errV) return res.status(500).json({ success: false, error: errV.message });
            
            res.json({ success: true, id_venta: resV.insertId });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});