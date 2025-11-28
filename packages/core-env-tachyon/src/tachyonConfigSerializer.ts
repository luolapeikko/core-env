import type {StandardSchemaV1} from '@standard-schema/spec';
import type {IPersistSerializer} from 'tachyon-drive';

export type TachyonConfigStoreType = {
	_v: 1;
	data: Record<string, string>;
};

export class TachyonConfigSerializer {
	public static jsonString(schema: StandardSchemaV1<unknown, TachyonConfigStoreType>): IPersistSerializer<TachyonConfigStoreType, string> {
		return {
			deserialize: (buffer: string) => JSON.parse(buffer),
			name: 'TachyonConfigJsonSerializer',
			serialize: (data: TachyonConfigStoreType) => JSON.stringify(data),
			validator: async (data: TachyonConfigStoreType) => !(await schema['~standard'].validate(data)).issues,
		};
	}
	public static jsonBuffer(schema: StandardSchemaV1<unknown, TachyonConfigStoreType>): IPersistSerializer<TachyonConfigStoreType, Buffer> {
		return {
			deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
			name: 'TachyonConfigJsonBufferSerializer',
			serialize: (data: TachyonConfigStoreType) => Buffer.from(JSON.stringify(data)),
			validator: async (data: TachyonConfigStoreType) => !(await schema['~standard'].validate(data)).issues,
		};
	}
	public static jsonArrayBuffer(schema: StandardSchemaV1<unknown, TachyonConfigStoreType>): IPersistSerializer<TachyonConfigStoreType, Uint8Array> {
		return {
			deserialize: (buffer: Uint8Array) => JSON.parse(new TextDecoder().decode(buffer)),
			name: 'TachyonConfigJsonArrayBufferSerializer',
			serialize: (data: TachyonConfigStoreType) => new TextEncoder().encode(JSON.stringify(data)),
			validator: async (data: TachyonConfigStoreType) => !(await schema['~standard'].validate(data)).issues,
		};
	}
}
