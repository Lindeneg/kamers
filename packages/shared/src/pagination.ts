export interface PaginationParams {
    page: number;
    pageSize: number;
}

export interface Paginated<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
