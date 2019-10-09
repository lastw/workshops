import { createStore, Middleware, applyMiddleware, compose, AnyAction } from 'redux';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__: any;
  }
}

function reducer(state = { actions: [] }, action) {
  return {
    actions: [...state.actions, action],
  };
}

const store = createStore(
  reducer,
  compose(
    applyMiddleware(getSignalMiddleware()),
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
  ),
);

function sequence(...actions) {
  return {
    type: 'sequence',
    payload: actions,
  };
}

function parallel(...actions) {
  return {
    type: 'parallel',
    payload: actions,
  };
}

function effect(handler: () => Promise<any>) {
  return {
    type: 'effect',
    payload: {
      handler,
    },
  };
}

function effectSuccess(data: any) {
  return {
    type: 'effect:success',
    payload: {
      data,
    },
  };
}

function fetchRandomNumber() {
  return effect(() => {
    return Promise.resolve(Math.random());
  });
}

function wait(time: number) {
  return effect(() => {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        resolve();
      }, time);
    });
  });
}

function fork(action) {
  return {
    type: 'fork',
    payload: action,
  };
}

function delayed(action: AnyAction, time: number) {
  return fork(sequence(wait(time), action));
}

/**
 **********************************
 **********************************
 **********************************
 */

const fetchRandomNumberWithDelay = () => {
  return sequence(delayed({ type: 'hello' }, 1000), { type: 'hello2' });
};

store.dispatch(fetchRandomNumberWithDelay());

/**
 **********************************
 **********************************
 **********************************
 */

function getSignalMiddleware(): Middleware {
  return ({ dispatch }) => {
    return (next) => {
      return (action) => {
        console.log('handle action', action);

        if (action.type === 'fork') {
          dispatch(action.payload);

          return Promise.resolve();
        }

        if (action.type === 'sequence') {
          let p = Promise.resolve();

          action.payload.forEach((a) => {
            p = p.then(() => dispatch(a));
          });

          return p;
        }

        if (action.type === 'parallel') {
          return Promise.all(
            action.payload.map((a) => {
              return dispatch(a);
            }),
          );
        }

        if (action.type === 'effect') {
          next(action);

          return action.payload.handler().then((data) => {
            dispatch(effectSuccess(data));
          });
        }

        return next(action);
      };
    };
  };
}
