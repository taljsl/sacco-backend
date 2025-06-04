import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import userRoutes from './routes/userRoutes';



const app = express();
const PORT = process.env.PORT || 5000;

// Add middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB before routing
connectDB();

// Register routes
app.use('/api/users', userRoutes);

app.get('/', (_req, res) => {
  res.send('API is running...');
});

// Start the server after all routes are registered
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
