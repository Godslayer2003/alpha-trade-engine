import { NotFoundException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

describe('portfolio ownership', () => {
  it('refuses a holding belonging to another user before any write', async () => {
    const prisma = { portfolio: { findFirst: jest.fn().mockResolvedValue({ id: 'mine', holdings: [] }) },
      holding: { update: jest.fn() } };
    const service = new PortfolioService(prisma as never, {} as never);
    await expect(service.setStopLoss('user-a', 'user-b-holding', 10)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.holding.update).not.toHaveBeenCalled();
  });
});
