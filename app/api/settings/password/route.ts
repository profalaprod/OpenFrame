import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiErrors, successResponse } from '@/lib/api-response';
import { logError } from '@/lib/logger';

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiErrors.unauthorized('Authentication required');
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (
      !currentPassword ||
      typeof currentPassword !== 'string'
    ) {
      return apiErrors.badRequest('Current password is required');
    }

    if (
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      return apiErrors.badRequest(
        'New password must be between 8 and 128 characters'
      );
    }

    if (currentPassword === newPassword) {
      return apiErrors.badRequest(
        'New password must be different from current password'
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return apiErrors.notFound('User');
    }

    if (!user.password) {
      return apiErrors.badRequest(
        'This account does not currently have a password'
      );
    }

    const currentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!currentPasswordValid) {
      return apiErrors.badRequest('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: newPasswordHash,
      },
    });

    return successResponse({
      message: 'Password changed successfully',
    });
  } catch (error) {
    logError('Error changing password:', error);
    return apiErrors.internalError('Failed to change password');
  }
}
