import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Address } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(userId: string, id: string): Promise<Address> {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException('This address does not belong to you');
    return address;
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    const existingCount = await this.prisma.address.count({ where: { userId } });
    // The first address a user saves is always their default.
    const shouldBeDefault = dto.isDefault === true || existingCount === 0;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: {
          userId,
          label: dto.label,
          customLabel: dto.customLabel,
          receiverName: dto.receiverName,
          receiverPhone: dto.receiverPhone,
          line1: dto.line1,
          line2: dto.line2,
          landmark: dto.landmark,
          locality: dto.locality,
          city: dto.city ?? 'Jaipur',
          state: dto.state ?? 'Rajasthan',
          pincode: dto.pincode,
          latitude: dto.latitude,
          longitude: dto.longitude,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto): Promise<Address> {
    await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.address.update({
        where: { id },
        data: {
          ...(dto.label !== undefined && { label: dto.label }),
          ...(dto.customLabel !== undefined && { customLabel: dto.customLabel }),
          ...(dto.receiverName !== undefined && { receiverName: dto.receiverName }),
          ...(dto.receiverPhone !== undefined && { receiverPhone: dto.receiverPhone }),
          ...(dto.line1 !== undefined && { line1: dto.line1 }),
          ...(dto.line2 !== undefined && { line2: dto.line2 }),
          ...(dto.landmark !== undefined && { landmark: dto.landmark }),
          ...(dto.locality !== undefined && { locality: dto.locality }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.state !== undefined && { state: dto.state }),
          ...(dto.pincode !== undefined && { pincode: dto.pincode }),
          ...(dto.latitude !== undefined && { latitude: dto.latitude }),
          ...(dto.longitude !== undefined && { longitude: dto.longitude }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        },
      });
    });
  }

  async setDefault(userId: string, id: string): Promise<Address> {
    await this.findOne(userId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: { isDefault: true } });
    });
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const address = await this.findOne(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });

      // Never leave the user without a default — promote the next most recent.
      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          select: { id: true },
        });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });

    return { id };
  }

  /** Used at checkout: the address to pre-select. */
  async getDefault(userId: string): Promise<Address | null> {
    return this.prisma.address.findFirst({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }
}
