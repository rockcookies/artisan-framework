export const TAGGED_PARAMETER = 'artisan:tagged_parameter';

export const TAGGED_PROPERTY = 'artisan:tagged_property';

export const TAGGED_CLASS = 'artisan:tagged_class';

export const TAGGED_ADVISOR = 'artisan:tagged_advisor';

export const TAGGED_ADVISOR_PROPERTY = 'artisan:tagged_advisor_property';

export const ConfigProviderToken = Symbol('ConfigProvider');

export const AdvisorProviderToken = Symbol('AdvisorProvider');

export enum ArtisanErrorType {
	BUILTIN = 'BUILTIN',
	ERROR = 'ERROR',
	EXCEPTION = 'EXCEPTION',
}
