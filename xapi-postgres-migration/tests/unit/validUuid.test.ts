import { expect } from 'chai'
import { v4 } from 'uuid'
import { checkIsUuid } from '../../src/utils'

describe('Check UUID', () => {
  it('validates valid uuuid', () => {
    const validUuid = v4()
    const result = checkIsUuid(validUuid)
    expect(result).to.be.true

    const validUuid2 = 'b1ee8254-07b8-415a-aa9b-8a4614b825ae'
    const result2 = checkIsUuid(validUuid2)
    expect(result2).to.be.true
  })
  it("doesn't validate invalid uuuid", () => {
    const invalidUuid = '978675645354657687980'
    const result = checkIsUuid(invalidUuid)
    expect(result).to.be.false
  })
})
