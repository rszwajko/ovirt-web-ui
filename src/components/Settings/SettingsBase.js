import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  Card,
  Col,
  ControlLabel,
  FormGroup,
  FieldLevelHelp,
} from 'patternfly-react'

import style from './style.css'

const LabelCol = ({ children, tooltip, ...props }) => {
  return <Col componentClass={ControlLabel} {...props}>
    { children } { tooltip && <FieldLevelHelp disabled={false} content={tooltip} inline /> }
  </Col>
}
LabelCol.propTypes = {
  children: PropTypes.node.isRequired,
  tooltip: PropTypes.string,
}

const Item = ({ title, isActive, onClick }) => {
  return <li className={`list-group-item ${isActive && 'active'}`}>
    <a href='#' onClick={(e) => { e.preventDefault(); onClick() }}>
      <span className='list-group-item-value'>{title}</span>
      <div className='badge-container-pf' />
    </a>
  </li>
}

Item.propTypes = {
  title: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
}

const Section = ({ name, section }) => (
  <React.Fragment>
    <h3><a id={name} />{section.title} { section.tooltip && <FieldLevelHelp disabled={false} content={section.tooltip} inline /> }</h3>
    { section.fields.map((field) => (
      <FormGroup key={field.title} className={style['settings-field']}>
        <LabelCol tooltip={field.tooltip} sm={3} className={style['field-label']}>
          { field.title }
        </LabelCol>
        <Col sm={9}>
          {field.body}
        </Col>
      </FormGroup>
    )) }
  </React.Fragment>
)

Section.propTypes = {
  name: PropTypes.string.isRequired,
  section: PropTypes.object.isRequired,
}

class SettingsBase extends Component {
  buildSection (key, section) {
    return (
      <Card key={key} className={style['main-content']}>
        <div className={style['main-content-container']}>
          <Section name={key} section={section} />
        </div>
      </Card>
    )
  }

  render () {
    const { sections } = this.props
    return (
      <div className={style['search-content-box']}>
        {Object.entries(sections).filter(([key, section]) => !!section).map(([key, section]) => this.buildSection(key, section))}
      </div>
    )
  }
}
SettingsBase.propTypes = {
  sections: PropTypes.object.isRequired,
}

export default SettingsBase
