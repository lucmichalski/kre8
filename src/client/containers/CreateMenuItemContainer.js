import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import * as yup from 'yup';
import * as actions from '../store/actions/actions';
import * as events from '../../eventTypes';

import OutsideClick from '../helperFunctions/OutsideClick';
import CreateMenuItemComponent from '../components/GraphComponents/CreateMenuItemComponent';
import HelpInfoButton from '../components/Buttons/HelpInfoButton';


const mapStateToProps = store => ({
  showCreateMenuFormItem: store.navbar.showCreateMenuFormItem,
  menuItemToShow: store.navbar.menuItemToShow,
});

const mapDispatchToProps = dispatch => ({
  toggleCreateMenuFormItem: (bool) => {
    dispatch(actions.toggleCreateMenuFormItem(bool));
  },
  toggleCreateMenuDropdown: (bool) => {
    dispatch(actions.toggleCreateMenuDropdown(bool));
  },
});

class CreateMenuItemContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      inputData: {
        pod: {
          podName: '',
          containerName: '',
          imageName: '',
        },
        deployment: {
          deploymentName: '',
          appName: '',
          containerName: '',
          image: '',
          containerPort: '',
          replicas: '',
        },
        service: {
          serviceName: '',
          appName: '',
          port: '',
          targetPort: '',
        },
      },
      errors: { pod: {}, deployment: {}, service: {} },
      display_error: false,
    };
    this.handleChange = this.handleChange.bind(this);

    this.handleCreatePod = this.handleCreatePod.bind(this);
    this.handleNewPod = this.handleNewPod.bind(this);

    this.handleCreateDeployment = this.handleCreateDeployment.bind(this);
    this.handleNewDeployment = this.handleNewDeployment.bind(this);

    this.handleCreateService = this.handleCreateService.bind(this);
    this.handleNewService = this.handleNewService.bind(this);

    this.showKubeDocs = this.showKubeDocs.bind(this);
    this.handleFormClose = this.handleFormClose.bind(this);
    this.handleOutsideFormClick = this.handleOutsideFormClick.bind(this);
  }

  // -------------- COMPONENT LIFECYCLE METHODS -----------------

  // DEPLOYMENT LIFECYCLE METHOD
  componentDidMount() {
    ipcRenderer.on(events.HANDLE_NEW_POD, this.handleNewPod);
    ipcRenderer.on(events.HANDLE_NEW_SERVICE, this.handleNewService);
    ipcRenderer.on(events.HANDLE_NEW_DEPLOYMENT, this.handleNewDeployment);
  }

  // On component unmount, we will unsubscribe to listeners
  componentWillUnmount() {
    ipcRenderer.removeListener(events.HANDLE_NEW_POD, this.handleNewPod);
    ipcRenderer.removeListener(events.HANDLE_NEW_SERVICE, this.handleNewService);
    ipcRenderer.removeListener(events.HANDLE_NEW_DEPLOYMENT, this.handleNewDeployment);
  }

  // ------------------- EVENT HANDLERS ------------------------

  // HANDLE CHANGE METHOD FOR FORMS
  handleChange(e) {
    const { value } = e.target;
    e.preventDefault();
    const split = e.target.id.split('_');
    this.setState((prevState) => {
      const newState = {
        ...prevState,
        inputData: {
          ...prevState.inputData,
          pod: { ...prevState.inputData.pod },
          deployment: { ...prevState.inputData.deployment },
          service: { ...prevState.inputData.service },
        },
      };
      newState.inputData[split[0]][split[1]] = value;
      return newState;
    });
  }

  // CREATE POD HANDLER
  handleCreatePod() {
    const { inputData } = this.state;
    const { pod } = inputData;
    const schema = yup.object().strict().shape({
      podName: yup.string().required().lowercase(),
      containerName: yup.string().required(),
      imageName: yup.string().required(),
    });
    schema.validate(pod, { abortEarly: false })
      .then((data) => {
        console.log('from the then', data);
        this.setState(prevState => ({ ...prevState, errors: { ...prevState.errors, pod: {} } }));
        ipcRenderer.send(events.CREATE_POD, data);
      })
      .catch((err) => {
        console.log('err', err);
        const errorObj = err.inner.reduce((acc, error) => {
          acc[error.path] = error.message;
          return acc;
        }, {});
        this.setState(prevState => ({ ...prevState, errors: { ...prevState.errors, pod: errorObj } }));
      });
  }

  // CREATE DEPLOYMENT HANDLER
  handleCreateDeployment() {
    const { inputData } = this.state;
    const { deployment } = inputData;
    const { toggleCreateMenuFormItem } = this.props;
    const clone = Object.assign({}, deployment);
    clone.containerPort = Number(clone.containerPort);
    clone.replicas = Number(clone.replicas);
    const schema = yup.object().strict().shape({
      deploymentName: yup.string().required().lowercase(),
      appName: yup.string().required().lowercase(),
      containerName: yup.string().required().lowercase(),
      image: yup.string().required().lowercase(),
      containerPort: yup.number().required().positive(),
      replicas: yup.number().required().positive().max(4),
    });
    schema.validate(clone, { abortEarly: false })
      .then((data) => {
        toggleCreateMenuFormItem();
        console.log('from the then', data);
        this.setState(prevState => ({ ...prevState, errors: { ...prevState.errors, deployment: {} } }));
        ipcRenderer.send(events.CREATE_DEPLOYMENT, data);
        ipcRenderer.send(events.START_LOADING_ICON, 'open');
        console.log('sent start loading icon on front from createmenuitemcontainer');
      })
      .catch((err) => {
        console.log('err', err);
        const errorObj = err.inner.reduce((acc, error) => {
          acc[error.path] = error.message;
          return acc;
        }, {});
        this.setState(prevState => ({ ...prevState, errors: { ...prevState.errors, deployment: errorObj } }));
      });
  }

  // CREATE SERVICE HANDLER
  handleCreateService() {
    console.log('!!!!!!!!!!!!!!!!!!!this.state: ', this.state.inputData.service);
    const { inputData } = this.state;
    const { service } = inputData;
    const clone = Object.assign({}, service);
    clone.port = Number(clone.port);
    clone.targetPort = Number(clone.targetPort);
    const schema = yup.object().strict().shape({
      serviceName: yup.string().required().lowercase(),
      appName: yup.string().required().lowercase(),
      port: yup.number().required().positive(),
      targetPort: yup.number().required().positive(),
    });
    schema.validate(clone, { abortEarly: false })
      .then((data) => {
        console.log('from the then', data);
        this.setState(prevState => ({ ...prevState, errors: { ...prevState.errors, service: {} } }));
        ipcRenderer.send(events.CREATE_SERVICE, data);
      })
      .catch((err) => {
        console.log('err', err);
        const errorObj = err.inner.reduce((acc, error) => {
          acc[error.path] = error.message;
          return acc;
        }, {});
        this.setState(prevState => ({ ...prevState, errors: { ...prevState.errors, service: errorObj } }));
      });
  }

  // SHOW KUBE DOCS
  showKubeDocs(modal) {
    if (modal === 'deployment'){
      ipcRenderer.send(events.SHOW_KUBE_DOCS_DEPLOYMENT);
    } else if (modal === 'service'){
      ipcRenderer.send(events.SHOW_KUBE_DOCS_SERVICE);
    }else if (modal === 'pod'){
      ipcRenderer.send(events.SHOW_KUBE_DOCS_POD);
    }
  }

  // --------------INCOMING DATA FROM MAIN THREAD-----------------

  // INCOMING POD DATA
  handleNewPod(event, data) {
    const { inputData } = this.state;
    const { pod } = inputData;
    console.log('incoming data from kubectl pod creation:', data);
    const emptyPodObj = Object.entries(pod).reduce((acc, item) => {
      acc[item[0]] = '';
      return acc;
    }, {});
    this.setState(prevState => ({ ...prevState, inputData: { ...prevState.inputData, pod: emptyPodObj } }));
  }

  // INCOMING DEPLOYMENT DATA
  handleNewDeployment(event, data) {
    // The following is going to be the logic that occurs once a new role was created via the main thread process
    const { inputData } = this.state;
    const { deployment } = inputData;
    console.log('incoming data from kubectl deployment creation:', data);
    const emptyDeploymentObj = Object.entries(deployment).reduce((acc, item) => {
      acc[item[0]] = '';
      return acc;
    }, {});
    this.setState(prevState => ({ ...prevState, inputData: { ...prevState.inputData, deployment: emptyDeploymentObj } }));
  }

  // INCOMING SERVICE DATA
  handleNewService(event, data) {
    // The following is going to be the logic that occurs once a new role was created via the main thread process
    const { inputData } = this.state;
    const { service } = inputData;
    console.log('incoming data from kubectl service creation:', data);
    const emptyServiceObj = Object.entries(service).reduce((acc, item) => {
      acc[item[0]] = '';
      return acc;
    }, {});
    this.setState(prevState => ({ ...prevState, inputData: { ...prevState.inputData, service: emptyServiceObj } }));
  }

  handleFormClose() {
    const { toggleCreateMenuFormItem, toggleCreateMenuDropdown } = this.props;
    toggleCreateMenuFormItem();
    toggleCreateMenuDropdown(false);
  }

  handleOutsideFormClick() {
    const { toggleCreateMenuFormItem } = this.props;
    toggleCreateMenuFormItem();
  }

  render() {
    const { menuItemToShow, showCreateMenuFormItem } = this.props;
    const { inputData, errors } = this.state;
    const inputDataToShow = inputData[menuItemToShow];
    const handleFunction = menuItemToShow === 'pod' ? this.handleCreatePod :
                           menuItemToShow === 'service' ? this.handleCreateService :
                           menuItemToShow === 'deployment' ? this.handleCreateDeployment : null;


    const textObj = {
      pod: 'Pods, hosts to containers via images, are the smallest deployable units of computing that can be created in Kubernetes. A pod’s contents are always co-located and co-scheduled, and run in a shared context. Rather than deploying a single pod (which is not rescheduled in the event of a failure, or displayed on the Kre8 graph), Kubernetes recommends launching a Replica Set via a Deployment.',
      // pod: 'A Pod is the smallest deployable unit in the Kubernetes object model.',
      service: 'A Service is an abstraction which defines a set of Pods and a policy by which to access them.',
      deployment: 'A Deployment is a controller that maintains the number of Pod replicas the user declares.',
    };
    const text = textObj[menuItemToShow];

    const moreInfoButtons = {
      pod: <button onClick={() => this.showKubeDocs('pod')} className="help_button" type="button">?</button>,
      service: <button onClick={() => this.showKubeDocs('service')} className="help_button" type="button">?</button>,
      deployment: <button onClick={() => this.showKubeDocs('deployment')} className="help_button" type="button">?</button>,
    };
    const button = moreInfoButtons[menuItemToShow];

    return (
      <div>
        {showCreateMenuFormItem === true && (
          <OutsideClick handleOutsideClick={this.handleOutsideFormClick}>
            <CreateMenuItemComponent
              handleChange={this.handleChange}
              menuItemToShow={menuItemToShow}
              handleFormClose={this.handleFormClose}
              handleFunction={handleFunction}
              infoText={text}
              infoButton={button}

              errors={errors}

              inputDataToShow={inputDataToShow}
            />
          </OutsideClick>
        )}
      </div>
    );
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(CreateMenuItemContainer));
