import test from 'ava'
import sinon from 'sinon'
import rewire from 'rewire'
import redisMock from 'redis-mock'
import { promisify } from 'util'
const User = rewire('../src/classes/User')

let { TEST_USER_ID } = process.env

test.before(t => {
  if (TEST_USER_ID == null || TEST_USER_ID === '') TEST_USER_ID = '1234'
  User.__set__({
    redisClient: redisMock.createClient()
  })
})

test.beforeEach(async t => {
  t.context.user = new User(TEST_USER_ID)
  // Overwrite redisClient in User to use mock redis
  let redisClient = User.__get__('redisClient')
  await promisify(redisClient.flushall).call(redisClient)
})

test('User has a constructor', t => {
  t.true(User.constructor != null, 'Constructor is undefined')
  t.is(typeof User.constructor, 'function', 'Constructor is not a function')
})

test('User without id throws error', t => {
  t.throws(() => new User())
})

test.serial('User can be deleted', async t => {
  let { user } = t.context
  t.true(user.delete != null, 'User#delete is not defined')
  t.is(typeof user.delete, 'function', 'User#delete is not a function')

  // XXX: Testing delete doesn't work with redis-mock because it doesn't have scan functionality
  // t.true(user.delete() instanceof Promise, 'User#delete is not a asynchronous')

  // Test that it actually deletes the user from Redis
  // let name = 'George Costanza'
  // await user.setName(name)
  // await user.delete()
  // let newName = await user.getName()
  // t.not(newName, name, 'User#delete did not delete the user')
  // t.is(newName, '', 'User#delete did not delete the user')
})

test('User has a name', async t => {
  let { user } = t.context
  t.true(user.getName != null, 'User#getName is not defined')
  t.is(typeof user.getName, 'function', 'User#getName is not a function')

  let name = await user.getName()
  t.true(typeof name === 'string', 'User#getName did not return a String')
  t.is(name, '', 'User#getName returned an unexpected value')
})

test('User can change name', async t => {
  let { user } = t.context
  let newName = 'George Costanza'
  t.true(user.setName != null, 'User#setName is not defined')
  t.is(typeof user.setName, 'function', 'User#setName is not a function')

  let name = await user.getName()
  t.not(name, newName, 'User#getName returned an unexpected value')
  await user.setName(newName)
  name = await user.getName()
  t.is(name, newName, 'User#getName returned an unexpected value')
})

test('User has a score', async t => {
  let { user } = t.context
  t.true(user.getScore != null, 'User#getScore is not defined')
  t.is(typeof user.getScore, 'function', 'User#getScore is not a function')

  let score = await user.getScore()
  t.false(isNaN(score), 'User#getScore returned an unexpected value')
  t.is(score, 0, 'User#getScore returned an unexpected value')
})

test('User can change score', async t => {
  let { user } = t.context
  let scoreIncrement = 10
  let scoreMultiplier = Math.floor(Math.random() * 10 + 1)
  let addScores = []
  t.true(user.addScore != null, 'User#addScore is not defined')
  t.is(typeof user.addScore, 'function', 'User#addScore is not a function')

  await user.addScore(scoreIncrement)
  let score = await user.getScore()
  t.is(score, scoreIncrement, 'User#setScore did not increment score')

  // Test adding multiple scores to see if it registers them all
  for (let index = 0; index < scoreMultiplier; index++) addScores.push(user.addScore(scoreIncrement))
  await Promise.all(addScores)
  let multipliedScore = await user.getScore()
  t.is(multipliedScore, scoreIncrement * scoreMultiplier + scoreIncrement, 'User#addScore failed to add multiple scores')

  // Score can be set
  await user.setScore(0)
  score = await user.getScore()
  t.is(score, 0, 'User#getScore returned an unexpected value')

  // Score can be negative
  await user.addScore(-1 * scoreIncrement)
  score = await user.getScore()
  t.is(score, scoreIncrement * -1, 'User#addScore did not decrement score')

  // Check that invalid addScore arguments throw error
  let spy = sinon.spy()
  await user.addScore().catch(spy)
  await user.addScore('?').catch(spy)
  // Should throw since it parses
  await user.addScore('-1').catch(spy)
  t.true(spy.calledTwice, 'User#getScore was expected to throw on invalid argument')
})

test.serial('User has badges', async t => {
  let { user } = t.context
  t.true(user.getBadges != null, 'User#addScore is not defined')
  t.is(typeof user.getBadges, 'function', 'User#addScore is not a function')

  let badges = await user.getBadges()
  t.true(badges instanceof Array, 'User#getBadges did not return an Array')
  t.is(badges.length, 0, 'User#getBadges did not return an Array of size 0')
})

test.serial('User can get a badge', async t => {
  let { user } = t.context
  t.true(user.giveBadge != null, 'User#giveBadge is not defined')
  t.is(typeof user.giveBadge, 'function', 'User#giveBadge is not a function')

  let originalBadges = await user.getBadges()
  await user.giveBadge(4)
  let badges = await user.getBadges()
  t.not(originalBadges, badges, 'User#giveBadge did not give badges')
  t.not(badges.length, originalBadges.length, 'User#giveBadge did not give badges')
  t.is(badges.length, 1, 'User#giveBadge did not give badges')
  t.deepEqual(badges, [4], 'User#giveBadge did not give badges')
})

test.serial('User can get badges', async t => {
  let { user } = t.context

  let originalBadges = await user.getBadges()
  await user.giveBadge([4, 8, 9])
  let badges = await user.getBadges()
  t.not(originalBadges, badges, 'User#giveBadge did not give badges')
  t.not(badges.length, originalBadges.length, 'User#giveBadge did not give badges')
  t.is(badges.length, 3, 'User#giveBadge did not give badges')
  t.deepEqual(badges, [4, 8, 9], 'User#giveBadge did not give badges')
})

test.serial('User can lose badges', async t => {
  let { user } = t.context
  t.true(user.takeBadge != null, 'User#takeBadge is not defined')
  t.is(typeof user.takeBadge, 'function', 'User#takeBadge is not a function')

  await user.giveBadge([4, 8, 9])
  let originalBadges = await user.getBadges()
  await user.takeBadge(4)
  let badges = await user.getBadges()
  t.not(originalBadges, badges, 'User#takeBadge did not take badges')
  t.not(badges.length, originalBadges.length, 'User#giveBadge did not take badges')
  t.deepEqual(badges, [8, 9], 'User#takeBadge did not take badges')
})

test.serial('User can check its badges', async t => {
  let { user } = t.context
  t.true(user.hasBadge != null, 'User#hasBadge is not defined')
  t.is(typeof user.hasBadge, 'function', 'User#hasBadge is not a function')

  // Check if it throws on lack of BadgeID
  let spy = sinon.spy()
  await user.hasBadge().catch(spy)
  t.true(spy.calledOnce)

  await user.giveBadge([4, 8, 9])
  t.true(await user.hasBadge(4), 'User#hasBadge returned an unexpected value')
  t.true(await user.hasBadge(8), 'User#hasBadge returned an unexpected value')
  t.true(await user.hasBadge(9), 'User#hasBadge returned an unexpected value')
  t.false(await user.hasBadge(3), 'User#hasBadge returned an unexpected value')
  t.false(await user.hasBadge(5), 'User#hasBadge returned an unexpected value')
  t.false(await user.hasBadge(12), 'User#hasBadge returned an unexpected value')
})

test('User can get leaderboard position', async t => {
  let { user } = t.context
  t.true(user.getLeaderboardIndex != null, 'User#getLeaderboardIndex is not defined')
  t.is(typeof user.getLeaderboardIndex, 'function', 'User#getLeaderboardIndex is not a function')

  let position = await user.getLeaderboardIndex()
  t.false(isNaN(position), 'User#getLeaderboardIndex returned an unexpected position')
  t.true(position >= -1, 'User#getLeaderboardIndex returned an unexpected position')
  t.true(Math.floor(position) === position, 'User#getLeaderboardIndex returned an unexpected position')
})
