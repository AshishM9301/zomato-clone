import AppError from '../../common/errors/AppError';
import {
  ORDER_STATUS,
} from '../../common/constants/orderStatus';
import * as orderRepo from '../orders/orders.repository';
import * as dispatchRepo from './dispatch.repository';

export async function listAvailable(actorMerchantId?: string) {
  return dispatchRepo.listAvailable(actorMerchantId);
}

export async function autoAssign(orderId: string) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (order.status !== ORDER_STATUS.READY_FOR_PICKUP) {
    throw AppError.businessRule(
      `Order must be in 'ready_for_pickup' to assign (current: ${order.status})`,
    );
  }

  const rider = await dispatchRepo.findFirstOnlineRider();
  if (!rider) throw AppError.businessRule('No online riders available');

  const result = await dispatchRepo.adminAssign(orderId, rider.id);
  if (!result) {
    // Lost the race; another assignment won.
    throw AppError.conflict('Order was assigned by someone else');
  }
  // Mark rider busy.
  await dispatchRepo.setRiderStatus(rider.id, 'busy');
  return result;
}

export async function riderAccept(orderId: string, riderId: string) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (order.status !== ORDER_STATUS.READY_FOR_PICKUP) {
    throw AppError.businessRule(
      `Order is not available for pickup (current status: ${order.status})`,
    );
  }
  const result = await dispatchRepo.claimOrderForRider(orderId, riderId);
  if (!result) {
    throw AppError.conflict('Order is no longer available');
  }
  await dispatchRepo.setRiderStatus(riderId, 'busy');
  return result;
}

export async function riderReject(assignmentId: string, riderId: string) {
  const assignment = await orderRepo.findAssignmentForRider(assignmentId, riderId);
  if (!assignment) throw AppError.notFound('Assignment not found');
  if (assignment.status !== 'active') {
    throw AppError.conflict('Assignment is not active');
  }
  await orderRepo.releaseAssignment(assignmentId);
  // Roll the order back to ready_for_pickup if it was assigned.
  const order = await orderRepo.findById(assignment.order_id);
  if (order && order.status === ORDER_STATUS.ASSIGNED) {
    await orderRepo.updateStatus(order.id, ORDER_STATUS.READY_FOR_PICKUP);
  }
  // Free the rider.
  await dispatchRepo.setRiderStatus(riderId, 'online');
  return { id: assignmentId, released: true };
}
