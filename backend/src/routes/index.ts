import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import merchantsRoutes from '../modules/merchants/merchants.routes';
import ridersRoutes from '../modules/riders/riders.routes';
import restaurantsRoutes from '../modules/restaurants/restaurants.routes';
import menusRoutes from '../modules/menus/menus.routes';
import ordersRoutes from '../modules/orders/orders.routes';
import dispatchRoutes from '../modules/dispatch/dispatch.routes';
import adminRoutes from '../modules/admin/admin.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/merchants', merchantsRoutes);
router.use('/riders', ridersRoutes);
router.use('/restaurants', restaurantsRoutes);
// menus owns /restaurants/:id/menu and /menu/items/* — mount at root.
router.use('/', menusRoutes);
router.use('/orders', ordersRoutes);
router.use('/dispatch', dispatchRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationsRoutes);

export default router;