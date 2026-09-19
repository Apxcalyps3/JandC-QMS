import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { Customer, GetQueueEstimateParams, HealthStatus, ListOrdersParams, Order, OrderAnalytics, OrderInput, OrderStats, OrderStatusUpdate, OrderUpdate, PaymentVerification, QueueEstimate, QueueReorderInput, QueueState, Service, ServiceInput, ServiceUpdate } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListOrdersUrl: (params?: ListOrdersParams) => string;
/**
 * @summary List all orders
 */
export declare const listOrders: (params?: ListOrdersParams, options?: RequestInit) => Promise<Order[]>;
export declare const getListOrdersQueryKey: (params?: ListOrdersParams) => readonly ["/api/orders", ...ListOrdersParams[]];
export declare const getListOrdersQueryOptions: <TData = Awaited<ReturnType<typeof listOrders>>, TError = ErrorType<unknown>>(params?: ListOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof listOrders>>>;
export type ListOrdersQueryError = ErrorType<unknown>;
/**
 * @summary List all orders
 */
export declare function useListOrders<TData = Awaited<ReturnType<typeof listOrders>>, TError = ErrorType<unknown>>(params?: ListOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateOrderUrl: () => string;
/**
 * @summary Create a new order
 */
export declare const createOrder: (orderInput: OrderInput, options?: RequestInit) => Promise<Order>;
export declare const getCreateOrderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<OrderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<OrderInput>;
}, TContext>;
export type CreateOrderMutationResult = NonNullable<Awaited<ReturnType<typeof createOrder>>>;
export type CreateOrderMutationBody = BodyType<OrderInput>;
export type CreateOrderMutationError = ErrorType<unknown>;
/**
* @summary Create a new order
*/
export declare const useCreateOrder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<OrderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<OrderInput>;
}, TContext>;
export declare const getGetOrderUrl: (id: number) => string;
/**
 * @summary Get a single order
 */
export declare const getOrder: (id: number, options?: RequestInit) => Promise<Order>;
export declare const getGetOrderQueryKey: (id: number) => readonly [`/api/orders/${number}`];
export declare const getGetOrderQueryOptions: <TData = Awaited<ReturnType<typeof getOrder>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOrder>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOrderQueryResult = NonNullable<Awaited<ReturnType<typeof getOrder>>>;
export type GetOrderQueryError = ErrorType<void>;
/**
 * @summary Get a single order
 */
export declare function useGetOrder<TData = Awaited<ReturnType<typeof getOrder>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateOrderUrl: (id: number) => string;
/**
 * @summary Update an order
 */
export declare const updateOrder: (id: number, orderUpdate: OrderUpdate, options?: RequestInit) => Promise<Order>;
export declare const getUpdateOrderMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrder>>, TError, {
        id: number;
        data: BodyType<OrderUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateOrder>>, TError, {
    id: number;
    data: BodyType<OrderUpdate>;
}, TContext>;
export type UpdateOrderMutationResult = NonNullable<Awaited<ReturnType<typeof updateOrder>>>;
export type UpdateOrderMutationBody = BodyType<OrderUpdate>;
export type UpdateOrderMutationError = ErrorType<void>;
/**
* @summary Update an order
*/
export declare const useUpdateOrder: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrder>>, TError, {
        id: number;
        data: BodyType<OrderUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateOrder>>, TError, {
    id: number;
    data: BodyType<OrderUpdate>;
}, TContext>;
export declare const getDeleteOrderUrl: (id: number) => string;
/**
 * @summary Delete/cancel an order
 */
export declare const deleteOrder: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteOrderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteOrder>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteOrder>>, TError, {
    id: number;
}, TContext>;
export type DeleteOrderMutationResult = NonNullable<Awaited<ReturnType<typeof deleteOrder>>>;
export type DeleteOrderMutationError = ErrorType<unknown>;
/**
* @summary Delete/cancel an order
*/
export declare const useDeleteOrder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteOrder>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteOrder>>, TError, {
    id: number;
}, TContext>;
export declare const getUpdateOrderStatusUrl: (id: number) => string;
/**
 * @summary Update order status (admin)
 */
export declare const updateOrderStatus: (id: number, orderStatusUpdate: OrderStatusUpdate, options?: RequestInit) => Promise<Order>;
export declare const getUpdateOrderStatusMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
        id: number;
        data: BodyType<OrderStatusUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
    id: number;
    data: BodyType<OrderStatusUpdate>;
}, TContext>;
export type UpdateOrderStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateOrderStatus>>>;
export type UpdateOrderStatusMutationBody = BodyType<OrderStatusUpdate>;
export type UpdateOrderStatusMutationError = ErrorType<void>;
/**
* @summary Update order status (admin)
*/
export declare const useUpdateOrderStatus: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
        id: number;
        data: BodyType<OrderStatusUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
    id: number;
    data: BodyType<OrderStatusUpdate>;
}, TContext>;
export declare const getVerifyOrderPaymentUrl: (id: number) => string;
/**
 * @summary Admin verify or reject payment
 */
export declare const verifyOrderPayment: (id: number, paymentVerification: PaymentVerification, options?: RequestInit) => Promise<Order>;
export declare const getVerifyOrderPaymentMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyOrderPayment>>, TError, {
        id: number;
        data: BodyType<PaymentVerification>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyOrderPayment>>, TError, {
    id: number;
    data: BodyType<PaymentVerification>;
}, TContext>;
export type VerifyOrderPaymentMutationResult = NonNullable<Awaited<ReturnType<typeof verifyOrderPayment>>>;
export type VerifyOrderPaymentMutationBody = BodyType<PaymentVerification>;
export type VerifyOrderPaymentMutationError = ErrorType<void>;
/**
* @summary Admin verify or reject payment
*/
export declare const useVerifyOrderPayment: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyOrderPayment>>, TError, {
        id: number;
        data: BodyType<PaymentVerification>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyOrderPayment>>, TError, {
    id: number;
    data: BodyType<PaymentVerification>;
}, TContext>;
export declare const getTrackOrderUrl: (orderNumber: string) => string;
/**
 * @summary Track order by order number (customer)
 */
export declare const trackOrder: (orderNumber: string, options?: RequestInit) => Promise<Order>;
export declare const getTrackOrderQueryKey: (orderNumber: string) => readonly [`/api/orders/track/${string}`];
export declare const getTrackOrderQueryOptions: <TData = Awaited<ReturnType<typeof trackOrder>>, TError = ErrorType<void>>(orderNumber: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof trackOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof trackOrder>>, TError, TData> & {
    queryKey: QueryKey;
};
export type TrackOrderQueryResult = NonNullable<Awaited<ReturnType<typeof trackOrder>>>;
export type TrackOrderQueryError = ErrorType<void>;
/**
 * @summary Track order by order number (customer)
 */
export declare function useTrackOrder<TData = Awaited<ReturnType<typeof trackOrder>>, TError = ErrorType<void>>(orderNumber: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof trackOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetOrderStatsUrl: () => string;
/**
 * @summary Order statistics summary (admin dashboard)
 */
export declare const getOrderStats: (options?: RequestInit) => Promise<OrderStats>;
export declare const getGetOrderStatsQueryKey: () => readonly ["/api/orders/stats/summary"];
export declare const getGetOrderStatsQueryOptions: <TData = Awaited<ReturnType<typeof getOrderStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrderStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOrderStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOrderStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getOrderStats>>>;
export type GetOrderStatsQueryError = ErrorType<unknown>;
/**
 * @summary Order statistics summary (admin dashboard)
 */
export declare function useGetOrderStats<TData = Awaited<ReturnType<typeof getOrderStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrderStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetOrderAnalyticsUrl: () => string;
/**
 * @summary Detailed analytics — timing, throughput, hourly breakdown
 */
export declare const getOrderAnalytics: (options?: RequestInit) => Promise<OrderAnalytics>;
export declare const getGetOrderAnalyticsQueryKey: () => readonly ["/api/orders/analytics"];
export declare const getGetOrderAnalyticsQueryOptions: <TData = Awaited<ReturnType<typeof getOrderAnalytics>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrderAnalytics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOrderAnalytics>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOrderAnalyticsQueryResult = NonNullable<Awaited<ReturnType<typeof getOrderAnalytics>>>;
export type GetOrderAnalyticsQueryError = ErrorType<unknown>;
/**
 * @summary Detailed analytics — timing, throughput, hourly breakdown
 */
export declare function useGetOrderAnalytics<TData = Awaited<ReturnType<typeof getOrderAnalytics>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrderAnalytics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetQueueUrl: () => string;
/**
 * @summary Get live queue with telemetry
 */
export declare const getQueue: (options?: RequestInit) => Promise<QueueState>;
export declare const getGetQueueQueryKey: () => readonly ["/api/queue"];
export declare const getGetQueueQueryOptions: <TData = Awaited<ReturnType<typeof getQueue>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQueue>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getQueue>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetQueueQueryResult = NonNullable<Awaited<ReturnType<typeof getQueue>>>;
export type GetQueueQueryError = ErrorType<unknown>;
/**
 * @summary Get live queue with telemetry
 */
export declare function useGetQueue<TData = Awaited<ReturnType<typeof getQueue>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQueue>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetQueueEstimateUrl: (params?: GetQueueEstimateParams) => string;
/**
 * @summary Get queue wait estimate for customer
 */
export declare const getQueueEstimate: (params?: GetQueueEstimateParams, options?: RequestInit) => Promise<QueueEstimate>;
export declare const getGetQueueEstimateQueryKey: (params?: GetQueueEstimateParams) => readonly ["/api/queue/estimate", ...GetQueueEstimateParams[]];
export declare const getGetQueueEstimateQueryOptions: <TData = Awaited<ReturnType<typeof getQueueEstimate>>, TError = ErrorType<unknown>>(params?: GetQueueEstimateParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQueueEstimate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getQueueEstimate>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetQueueEstimateQueryResult = NonNullable<Awaited<ReturnType<typeof getQueueEstimate>>>;
export type GetQueueEstimateQueryError = ErrorType<unknown>;
/**
 * @summary Get queue wait estimate for customer
 */
export declare function useGetQueueEstimate<TData = Awaited<ReturnType<typeof getQueueEstimate>>, TError = ErrorType<unknown>>(params?: GetQueueEstimateParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQueueEstimate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getReorderQueueUrl: () => string;
/**
 * @summary Reorder queue (admin manual override)
 */
export declare const reorderQueue: (queueReorderInput: QueueReorderInput, options?: RequestInit) => Promise<QueueState>;
export declare const getReorderQueueMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderQueue>>, TError, {
        data: BodyType<QueueReorderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof reorderQueue>>, TError, {
    data: BodyType<QueueReorderInput>;
}, TContext>;
export type ReorderQueueMutationResult = NonNullable<Awaited<ReturnType<typeof reorderQueue>>>;
export type ReorderQueueMutationBody = BodyType<QueueReorderInput>;
export type ReorderQueueMutationError = ErrorType<unknown>;
/**
* @summary Reorder queue (admin manual override)
*/
export declare const useReorderQueue: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderQueue>>, TError, {
        data: BodyType<QueueReorderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof reorderQueue>>, TError, {
    data: BodyType<QueueReorderInput>;
}, TContext>;
export declare const getListServicesUrl: () => string;
/**
 * @summary List all services
 */
export declare const listServices: (options?: RequestInit) => Promise<Service[]>;
export declare const getListServicesQueryKey: () => readonly ["/api/services"];
export declare const getListServicesQueryOptions: <TData = Awaited<ReturnType<typeof listServices>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listServices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listServices>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListServicesQueryResult = NonNullable<Awaited<ReturnType<typeof listServices>>>;
export type ListServicesQueryError = ErrorType<unknown>;
/**
 * @summary List all services
 */
export declare function useListServices<TData = Awaited<ReturnType<typeof listServices>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listServices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateServiceUrl: () => string;
/**
 * @summary Create a service
 */
export declare const createService: (serviceInput: ServiceInput, options?: RequestInit) => Promise<Service>;
export declare const getCreateServiceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createService>>, TError, {
        data: BodyType<ServiceInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createService>>, TError, {
    data: BodyType<ServiceInput>;
}, TContext>;
export type CreateServiceMutationResult = NonNullable<Awaited<ReturnType<typeof createService>>>;
export type CreateServiceMutationBody = BodyType<ServiceInput>;
export type CreateServiceMutationError = ErrorType<unknown>;
/**
* @summary Create a service
*/
export declare const useCreateService: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createService>>, TError, {
        data: BodyType<ServiceInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createService>>, TError, {
    data: BodyType<ServiceInput>;
}, TContext>;
export declare const getUpdateServiceUrl: (id: number) => string;
/**
 * @summary Update a service
 */
export declare const updateService: (id: number, serviceUpdate: ServiceUpdate, options?: RequestInit) => Promise<Service>;
export declare const getUpdateServiceMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateService>>, TError, {
        id: number;
        data: BodyType<ServiceUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateService>>, TError, {
    id: number;
    data: BodyType<ServiceUpdate>;
}, TContext>;
export type UpdateServiceMutationResult = NonNullable<Awaited<ReturnType<typeof updateService>>>;
export type UpdateServiceMutationBody = BodyType<ServiceUpdate>;
export type UpdateServiceMutationError = ErrorType<void>;
/**
* @summary Update a service
*/
export declare const useUpdateService: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateService>>, TError, {
        id: number;
        data: BodyType<ServiceUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateService>>, TError, {
    id: number;
    data: BodyType<ServiceUpdate>;
}, TContext>;
export declare const getDeleteServiceUrl: (id: number) => string;
/**
 * @summary Delete a service
 */
export declare const deleteService: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteServiceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteService>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteService>>, TError, {
    id: number;
}, TContext>;
export type DeleteServiceMutationResult = NonNullable<Awaited<ReturnType<typeof deleteService>>>;
export type DeleteServiceMutationError = ErrorType<unknown>;
/**
* @summary Delete a service
*/
export declare const useDeleteService: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteService>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteService>>, TError, {
    id: number;
}, TContext>;
export declare const getListCustomersUrl: () => string;
/**
 * @summary List all customers (admin)
 */
export declare const listCustomers: (options?: RequestInit) => Promise<Customer[]>;
export declare const getListCustomersQueryKey: () => readonly ["/api/customers"];
export declare const getListCustomersQueryOptions: <TData = Awaited<ReturnType<typeof listCustomers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCustomers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCustomers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCustomersQueryResult = NonNullable<Awaited<ReturnType<typeof listCustomers>>>;
export type ListCustomersQueryError = ErrorType<unknown>;
/**
 * @summary List all customers (admin)
 */
export declare function useListCustomers<TData = Awaited<ReturnType<typeof listCustomers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCustomers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetFileUrl: (filename: string) => string;
/**
 * @summary Get uploaded file
 */
export declare const getFile: (filename: string, options?: RequestInit) => Promise<void>;
export declare const getGetFileQueryKey: (filename: string) => readonly [`/api/files/${string}`];
export declare const getGetFileQueryOptions: <TData = Awaited<ReturnType<typeof getFile>>, TError = ErrorType<unknown>>(filename: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFile>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFileQueryResult = NonNullable<Awaited<ReturnType<typeof getFile>>>;
export type GetFileQueryError = ErrorType<unknown>;
/**
 * @summary Get uploaded file
 */
export declare function useGetFile<TData = Awaited<ReturnType<typeof getFile>>, TError = ErrorType<unknown>>(filename: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map