import after    from './after'
import validate from './options'
import browser  from './util/browser'
import Suite    from './test'

export default class A11y {

  /**
   * @arg {object} React    - The React instance you want to patch
   * @arg {object} ReactDOM - The ReactDOM instance you'll be using
   * @arg {object} options  - the options
   * @returns {A11y} The react-a11y instance
   */
  constructor (...args) {
    const {
      React
    , ReactDOM
    , ...options
    } = validate(...args)

    this.options  = options
    this.React    = React
    this.ReactDOM = ReactDOM
    this.suite  = new Suite(React, ReactDOM, this.options)
    this.patchReact()
  }

  /**
   * Patch React, replacing its createElement by our implementation
   * so we can run the tests
   * @returns {undefined}
   */
  patchReact () {

    // save old createElement
    this._createElement  = this.React.createElement

    const that = this
    this.React.createElement = function (klass, _props = {}, ...children) {

      // fix for props = null
      const props = _props || {}

      // create a refs object to hold the ref.
      // this needs to be an object so that it can be passed
      // by reference, and hold chaning state.
      const refs = typeof props.__reference === 'string' ? props.__reference : {}
      const ref = typeof props.__reference === 'string'
        ? props.__reference
        : function (node) {
          refs.node = node

          // maintain behaviour when ref prop was already set
          if ( typeof props.__reference === 'function' ) {
            props.__reference(node)
          }
        }

      const newProps  = typeof klass === 'string' ? { ref, __reference: ref, ...props } : props

      const reactEl   = that._createElement(klass, newProps, ...children)

      // only test html elements
      if (typeof klass === 'string') {

        const handler         = that.failureHandler(reactEl, refs)
        const childrenForTest = children.length === 0
          ? props.children || []
          : children

        that.suite.test(klass, props, childrenForTest, handler)
      }

      return reactEl
    }
  }

  /**
   * Restore React and all components as if we were never here
   * @returns {undefined}
   */
  restoreAll () {
    this.React.createElement = this._createElement
    after.restorePatchedMethods()
  }

  /**
   * Creates a failure handler based on the element that was created
   * @arg {object} reactEl - The react element this failure is for
   * @arg {object} ref     - The object that holds the DOM node (passed by ref)
   * @returns {function} A handler that knows everything it needs to know
   */
  failureHandler (reactEl, ref) {
    const {
      reporter
    , filterFn
    } = this.options

    /**
     * @arg {string} errInfo  - All the error info (see docs what this means)
     * @returns {undefined}
     */
    return function (errInfo) {

      // get the owning component (the one that has
      // the element in its render fn)
      const owner = reactEl._owner

      // if there is an owner, use its name
      // if not, use the tagname of the violating elemnent
      const displayName = owner && owner.getName()

      // stop if we're not allowed to proceed
      if ( !filterFn(displayName, errInfo.props.id, errInfo.msg) ) {
        return
      }

      // gather all info for the reporter
      const info = {
        ...errInfo
      , displayName
      }

      // if we need to include the rendered node, we need to wait until
      // the owner has rendered
      // TODO: reduce the number of case where ther is no instance
      // by forcing every component to have one.
      if ( browser && !this.__sync && owner && owner._instance ) {
        const instance = owner._instance
        // Cannot log a node reference until the component is in the DOM,
        // so defer the call until componentDidMount or componentDidUpdate.
        after.render(instance, function () {
          // unpack the ref
          let DOMNode = false
          if ( typeof ref === 'string' ) {
            DOMNode = this.ReactDOM.findDOMNode(instance.refs[ref])
          } else if ( 'node' in ref ) {
            DOMNode = ref.node
          } else {
            DOMNode = null
          }

          reporter({ ...info, DOMNode })
        }.bind(this))
      } else {
        reporter(info)
      }
    }.bind(this)
  }
}
