import { inject, injectable } from 'tsyringe';
import { validate } from 'uuid';

import AppError from '@shared/errors/AppError';

import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IRequest {
  id: string;
}

@injectable()
class FindOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
  ) {}

  public async execute({ id }: IRequest): Promise<Order | undefined> {
    const isValidUuid = validate(id);

    if (!isValidUuid) {
      throw new AppError('Please provide a valid ID.');
    }

    const order = await this.ordersRepository.findById(id);

    return order;
  }
}

export default FindOrderService;
