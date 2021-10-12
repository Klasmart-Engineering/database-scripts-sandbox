import { Column, Entity, PrimaryColumn } from 'typeorm'
import { XApiObject, IGeolocationInfo } from '../interfaces'

@Entity({ name: 'xapi_record' })
export class XApiRecord {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  public userId!: string

  @PrimaryColumn({
    type: 'bigint',
    name: 'server_timestamp',
    transformer: {
      to: (entityValue: number) => entityValue,
      from: (databaseValue: string): number => Number(databaseValue),
    },
  })
  serverTimestamp!: number

  @Column({ type: 'jsonb', nullable: true })
  public xapi?: XApiObject

  @Column({ name: 'ip_hash' })
  ipHash!: string

  @Column({ nullable: true, type: 'json' })
  geo?: IGeolocationInfo | null

  private constructor(
    userId: string,
    serverTimestamp: number,
    xapi?: XApiObject,
    ipHash?: string,
    geo?: IGeolocationInfo,
  ) {
    this.userId = userId
    this.serverTimestamp = serverTimestamp
    this.xapi = xapi
    this.ipHash = ipHash || ''
    this.geo = geo
  }

  public static new(
    userId: string,
    serverTimestamp: number,
    xapi?: XApiObject,
    ipHash?: string,
    geo?: IGeolocationInfo,
  ): XApiRecord {
    const xapiRecordObject = new XApiRecord(
      userId,
      serverTimestamp,
      xapi,
      ipHash,
      geo,
    )
    return xapiRecordObject
  }
}
