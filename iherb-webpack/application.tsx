import * as View from './components/sub-components'
import * as React from "react";

class Application extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    <div id="application">
      <div>my_application</div>
      <View.SubComponent />
    </div>  
  }
}

export default Application