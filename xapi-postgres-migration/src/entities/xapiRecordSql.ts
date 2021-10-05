import { Column, Entity, PrimaryColumn } from 'typeorm'
import { XApiObject } from '../interfaces'

@Entity({ name: 'xapi_record' })
export class XApiRecordSql {
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

  private constructor(
    userId: string,
    serverTimestamp: number,
    xapi?: XApiObject,
    ipHash?: string,
  ) {
    this.userId = userId
    this.serverTimestamp = serverTimestamp
    this.xapi = xapi
    this.ipHash = ipHash || ''
  }

  public static new(
    userId: string,
    serverTimestamp: number,
    xapi?: XApiObject,
    ipHash?: string,
  ): XApiRecordSql {
    const xapiRecordObject = new XApiRecordSql(
      userId,
      serverTimestamp,
      xapi,
      ipHash,
    )
    return xapiRecordObject
  }
}
