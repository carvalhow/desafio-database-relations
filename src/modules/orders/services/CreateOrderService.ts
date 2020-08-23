import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const existingCustomer = await this.customersRepository.findById(
      customer_id,
    );

    if (!existingCustomer) {
      throw new AppError('Provided customer ID does not exist.');
    }

    const requestedProducts = await this.productsRepository.findAllById(
      products,
    );

    if (!requestedProducts.length) {
      throw new AppError('Products not found.');
    }

    const productsIds = requestedProducts.map(product => product.id);
    const invalidProducts = products.filter(
      product => !productsIds.includes(product.id),
    );

    if (invalidProducts.length) {
      throw new AppError(`Product(s) ${invalidProducts.join()} not found`);
    }

    const productsWithoutStock = products.filter(
      product =>
        requestedProducts.filter(p => p.id === product.id)[0].quantity <
        product.quantity,
    );

    if (productsWithoutStock.length) {
      throw new AppError(
        `Product(s) ${productsWithoutStock.join()} exceed(s) available quantities`,
      );
    }

    const orderProducts = requestedProducts.map(product => ({
      product_id: product.id,
      price: product.price,
      quantity: products.filter(p => p.id === product.id)[0].quantity,
    }));

    const order = await this.ordersRepository.create({
      customer: existingCustomer,
      products: orderProducts,
    });

    const updatedProductsQuantities = products.map(product => ({
      id: product.id,
      quantity:
        requestedProducts.filter(p => p.id === product.id)[0].quantity -
        product.quantity,
    }));

    await this.productsRepository.updateQuantity(updatedProductsQuantities);

    return order;
  }
}

export default CreateOrderService;
