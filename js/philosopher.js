//Dining Philosopher's Problem

const cluster = require('cluster')
const FREE = 0
const LOCKED = 1
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

//Defining the functionalities of a Philosopher
class Philosopher 
{
  constructor (name, left, right) 
  {
    this.name = name
    this.left = left
    this.right = right
  }
  //Calling lock, free and eat functions according to the philosopher's states
  async eat (table) 
  {
    const left = await table.forks[this.left].lock()
    console.log('%s picked up left(%s) fork.', this.name, this.left)

    await sleep(1000)

    const right = await table.forks[this.right].lock()
    console.log('%s picked up right(%s) fork.', this.name, this.right)

    console.log('%s is eating.', this.name)
    await sleep(1000)
    console.log('%s is done eating.', this.name)

    await left.free()
    console.log('%s put down left(%s) fork.', this.name, this.left)

    await right.free()
    console.log('%s put down right(%s) fork.', this.name, this.right)
  }
}
//Function for the dining table which defines the number of forks
class Table {
  constructor (forkSize) {
    this.forkSize = forkSize
    this.forks = []
    for (let i = 0; i < forkSize; i++) {
      this.forks.push(new Mutex(i))
    }
  }
}
/*Mutex function which locks and frees the forks in order to prevent the
problems arising due to preemption*/ 
class Mutex {
  constructor (sharedMemoryIndex) {
    this.sharedMemoryIndex = sharedMemoryIndex
  }
  //Function which locks the fork in use
  async lock () {
    const tryLock = () => new Promise((resolve) => {
      const callback = ({ operation, returns }) => {
        if (operation !== 'lock') {
          return
        }
        process.removeListener('message', callback)
        resolve(returns)
      }
      process.on('message', callback)
      process.send({ operation: 'lock', index: this.sharedMemoryIndex })
    })

    while (1) {
      const ret = await tryLock()
      if (ret !== 'timed-out') {
        break
      }
    }

    return this
  }
  //Function which frees the locked fork after use
  async free () {
    return new Promise((resolve) => {
      const callback = ({ operation, returns }) => {
        if (operation !== 'free') {
          return
        }
        process.removeListener('message', callback)
        resolve(returns)
      }
      process.on('message', callback)
      process.send({ operation: 'free', index: this.sharedMemoryIndex })
    })
  }
}
/*Philosophers sitting on the table and the order in which they will pick
up the fork*/

if (cluster.isMaster) {
  const table = new Table(5)
  const philosophers = [
    new Philosopher('Philosopher 1', 0, 1),
    new Philosopher('Philosopher 2', 1, 2),
    new Philosopher('Philosopher 3', 2, 3),
    new Philosopher('Philosopher 4', 3, 4),
    new Philosopher('Philosopher 5', 4, 0),
  ]
  //Condition in the case if a fork is fixed or free
  const sab = new SharedArrayBuffer(5 * Int32Array.BYTES_PER_ELEMENT)
  const sharedArray = new Int32Array(sab)
  const main = async (philosophers) => {
    for (philosopher of philosophers) {
      const worker = cluster.fork()
      worker.send({ philosopher, table })
      worker.on('message', ({ operation, index }) => {
        switch (operation) {
          case 'lock': {
            const result = Atomics.notify(sharedArray, index, LOCKED, 1)
            if (result !== 'timed-out') {
              Atomics.store(sharedArray, index, LOCKED)
            }
            worker.send({
              operation,
              returns: result,
            })
            break
          }
          case 'free': {
            Atomics.store(sharedArray, index, FREE)
            worker.send({
              operation,
              returns: Atomics.notify(sharedArray, index, 1),
            })
            break
          }
          default:
            throw new Error(`Unknown operation: '${operation}' from worker#${worker.id}`)
        }
      })
    }
  }

  main(philosophers)

} 

else if (cluster.isWorker) {
  const main = async (philosopher, table) => {
    await philosopher.eat(table)
    cluster.worker.disconnect()
  }

  process.once('message', ({ philosopher, table }) => {
    main(
      new Philosopher(philosopher.name, philosopher.left, philosopher.right),
      new Table(table.forkSize)
    )
  })
}
