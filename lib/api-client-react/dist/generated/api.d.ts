import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { Activity, DashboardSummary, GetActivityParams, HealthStatus, Issue, IssueDetail, IssueInput, IssueStatusUpdate, ListIssuesParams, Team } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
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
export declare const getGetDashboardSummaryUrl: () => string;
/**
 * @summary Get Jansetu dashboard summary
 */
export declare const getDashboardSummary: (options?: Parameters<typeof customFetch>[1]) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get Jansetu dashboard summary
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetActivityUrl: (params?: GetActivityParams) => string;
/**
 * @summary Get recent platform activity
 */
export declare const getActivity: (params?: GetActivityParams, options?: Parameters<typeof customFetch>[1]) => Promise<Activity[]>;
export declare const getGetActivityQueryKey: (params?: GetActivityParams) => readonly ["/api/activity", ...GetActivityParams[]];
export declare const getGetActivityQueryOptions: <TData = Awaited<ReturnType<typeof getActivity>>, TError = ErrorType<unknown>>(params?: GetActivityParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getActivity>>>;
export type GetActivityQueryError = ErrorType<unknown>;
/**
 * @summary Get recent platform activity
 */
export declare function useGetActivity<TData = Awaited<ReturnType<typeof getActivity>>, TError = ErrorType<unknown>>(params?: GetActivityParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListIssuesUrl: (params?: ListIssuesParams) => string;
/**
 * @summary List civic issues
 */
export declare const listIssues: (params?: ListIssuesParams, options?: Parameters<typeof customFetch>[1]) => Promise<Issue[]>;
export declare const getListIssuesQueryKey: (params?: ListIssuesParams) => readonly ["/api/issues", ...ListIssuesParams[]];
export declare const getListIssuesQueryOptions: <TData = Awaited<ReturnType<typeof listIssues>>, TError = ErrorType<unknown>>(params?: ListIssuesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listIssues>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listIssues>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListIssuesQueryResult = NonNullable<Awaited<ReturnType<typeof listIssues>>>;
export type ListIssuesQueryError = ErrorType<unknown>;
/**
 * @summary List civic issues
 */
export declare function useListIssues<TData = Awaited<ReturnType<typeof listIssues>>, TError = ErrorType<unknown>>(params?: ListIssuesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listIssues>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateIssueUrl: () => string;
/**
 * @summary Submit a civic issue for AI analysis and routing
 */
export declare const createIssue: (issueInput: IssueInput, options?: Parameters<typeof customFetch>[1]) => Promise<Issue>;
export declare const getCreateIssueMutationKey: () => readonly ["createIssue"];
export declare const getCreateIssueMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createIssue>>, TError, CreateIssueMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createIssue>>, TError, CreateIssueMutationVariables, TContext>;
export type CreateIssueMutationResult = NonNullable<Awaited<ReturnType<typeof createIssue>>>;
export type CreateIssueMutationBody = BodyType<IssueInput>;
export type CreateIssueMutationError = ErrorType<unknown>;
export type CreateIssueMutationVariables = {
    data: BodyType<IssueInput>;
};
/**
* @summary Submit a civic issue for AI analysis and routing
*/
export declare const useCreateIssue: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createIssue>>, TError, CreateIssueMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createIssue>>, TError, CreateIssueMutationVariables, TContext>;
export declare const getGetIssueUrl: (id: number) => string;
/**
 * @summary Get a civic issue with its timeline
 */
export declare const getIssue: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<IssueDetail>;
export declare const getGetIssueQueryKey: (id: number) => readonly [`/api/issues/${number}`];
export declare const getGetIssueQueryOptions: <TData = Awaited<ReturnType<typeof getIssue>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getIssue>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getIssue>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetIssueQueryResult = NonNullable<Awaited<ReturnType<typeof getIssue>>>;
export type GetIssueQueryError = ErrorType<void>;
/**
 * @summary Get a civic issue with its timeline
 */
export declare function useGetIssue<TData = Awaited<ReturnType<typeof getIssue>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getIssue>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateIssueStatusUrl: (id: number) => string;
/**
 * @summary Update the status of a civic issue
 */
export declare const updateIssueStatus: (id: number, issueStatusUpdate: IssueStatusUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<Issue>;
export declare const getUpdateIssueStatusMutationKey: () => readonly ["updateIssueStatus"];
export declare const getUpdateIssueStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateIssueStatus>>, TError, UpdateIssueStatusMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateIssueStatus>>, TError, UpdateIssueStatusMutationVariables, TContext>;
export type UpdateIssueStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateIssueStatus>>>;
export type UpdateIssueStatusMutationBody = BodyType<IssueStatusUpdate>;
export type UpdateIssueStatusMutationError = ErrorType<unknown>;
export type UpdateIssueStatusMutationVariables = {
    id: number;
    data: BodyType<IssueStatusUpdate>;
};
/**
* @summary Update the status of a civic issue
*/
export declare const useUpdateIssueStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateIssueStatus>>, TError, UpdateIssueStatusMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateIssueStatus>>, TError, UpdateIssueStatusMutationVariables, TContext>;
export declare const getListTeamsUrl: () => string;
/**
 * @summary List student teams and partner organizations
 */
export declare const listTeams: (options?: Parameters<typeof customFetch>[1]) => Promise<Team[]>;
export declare const getListTeamsQueryKey: () => readonly ["/api/teams"];
export declare const getListTeamsQueryOptions: <TData = Awaited<ReturnType<typeof listTeams>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTeams>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTeams>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTeamsQueryResult = NonNullable<Awaited<ReturnType<typeof listTeams>>>;
export type ListTeamsQueryError = ErrorType<unknown>;
/**
 * @summary List student teams and partner organizations
 */
export declare function useListTeams<TData = Awaited<ReturnType<typeof listTeams>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTeams>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListTeamIssuesUrl: (id: number) => string;
/**
 * @summary List issues assigned to a team
 */
export declare const listTeamIssues: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<Issue[]>;
export declare const getListTeamIssuesQueryKey: (id: number) => readonly [`/api/teams/${number}/issues`];
export declare const getListTeamIssuesQueryOptions: <TData = Awaited<ReturnType<typeof listTeamIssues>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTeamIssues>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTeamIssues>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTeamIssuesQueryResult = NonNullable<Awaited<ReturnType<typeof listTeamIssues>>>;
export type ListTeamIssuesQueryError = ErrorType<unknown>;
/**
 * @summary List issues assigned to a team
 */
export declare function useListTeamIssues<TData = Awaited<ReturnType<typeof listTeamIssues>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTeamIssues>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map