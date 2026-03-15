import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebUserDto, CreateWebKitchenDto } from './dto/web-waitlist.dto';

@Injectable()
export class WebWaitlistService {
  private readonly logger = new Logger(WebWaitlistService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerUser(dto: CreateWebUserDto) {
    // Check if the mobile number is already registered for waitlist
    const existing = await this.prisma.webUserPreRegistration.findFirst({
      where: { mobileNo: dto.mobileNo },
    });

    if (existing) {
      throw new ConflictException('This mobile number is already on the waitlist.');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.webUserPreRegistration.findFirst({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('This email is already on the waitlist.');
      }
    }

    const { role, ...restDto } = dto;
    const userRole = role.toUpperCase() === 'VENDOR' ? 'VENDOR' : 'USER';

    const result = await this.prisma.webUserPreRegistration.create({
      data: {
        ...restDto,
        role: userRole,
      },
    });

    this.logger.log(`New user waitlist registration: ${dto.fullName} (${dto.mobileNo})`);
    return result;
  }

  async registerKitchen(dto: CreateWebKitchenDto) {
    // Check if the mobile number is already registered for kitchen waitlist
    const existing = await this.prisma.webKitchenPreRegistration.findFirst({
      where: { mobileNo: dto.mobileNo },
    });

    if (existing) {
      throw new ConflictException('This mobile number is already registered as a kitchen waitlist.');
    }

    const result = await this.prisma.webKitchenPreRegistration.create({
      data: {
        ...dto,
      },
    });

    this.logger.log(`New kitchen waitlist registration: ${dto.kitchenName} (${dto.mobileNo})`);
    return result;
  }
}
