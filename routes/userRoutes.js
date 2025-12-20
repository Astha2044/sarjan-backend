import express from 'express';
import { getUsers, registerUser, getUserById } from '../controllers/userController.js';

const router = express.Router();

router.route('/').get(getUsers).post(registerUser);
router.route('/:id').get(getUserById);

export default router;
