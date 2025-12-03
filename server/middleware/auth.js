const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
    try {
        // Token header se nikalo (Jo frontend bhejega: Bearer token)
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided or invalid format." });
        }

        const token = authHeader.split(" ")[1];

        if (!token) return res.status(401).json({ message: "No token provided." });

        // Token verify karo
        const isCustomAuth = token.length < 500; // Check if it's our JWT

        if (token && isCustomAuth) {
            const decodedData = jwt.verify(token, 'SECRET_KEY'); // Wahi secret key jo login mein use ki thi
            req.userId = decodedData?.id; // User ki ID request mein jod do
        } else {
            // Agar future mein Google/OAuth use karna ho
            // req.userId = decodedData?.sub;
        }

        next(); // Sab theek hai, aage badho
    } catch (error) {
        console.error("Auth Error:", error.message);
        res.status(401).json({ message: "Invalid Token or Session Expired." });
    }
};

module.exports = auth;