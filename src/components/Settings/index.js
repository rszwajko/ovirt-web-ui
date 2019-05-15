import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  Card,
  TypeAheadSelect,
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

const Section = ({ section }) => (
  <React.Fragment>
    <h3>{section.title} { section.tooltip && <FieldLevelHelp disabled={false} content={section.tooltip} inline /> }</h3>
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
  section: PropTypes.object.isRequired,
}

class Settings extends Component {
  constructor (props) {
    super(props)
    this.state = {
      selectedSection: Object.keys(props.sections)[0],
    }
    this.handleSectionChange = this.handleSectionChange.bind(this)
    this.buildItems = this.buildItems.bind(this)
    this.handleSearch = this.handleSearch.bind(this)
  }

  handleSectionChange (section) {
    this.setState({ selectedSection: section })
  }

  buildItems () {
    const { sections } = this.props
    const sectionsItems = []
    for (let i in sections) {
      if (sections[i]) {
        const handleClick = (() => this.handleSectionChange.bind(this, i))()
        sectionsItems.push(<Item
          key={i}
          title={Array.isArray(sections[i]) ? sections[i][0].title : sections[i].title}
          onClick={handleClick}
          isActive={i === this.state.selectedSection}
        />)
      }
    }
    return sectionsItems
  }

  handleSearch (options) {
    const { sections } = this.props
    const option = options[0]
    for (let i in sections) {
      const fields = Array.isArray(sections[i]) ? sections[i].reduce((a, v) => [...a, ...v.fields], []) : sections[i].fields
      if (fields.find(v => v.title === option) !== undefined) {
        this.handleSectionChange(i)
        break
      }
    }
  }
  buildSection (section) {
    if (Array.isArray(section)) {
      return <div className={style['main-content-container']}>
        { section.map(s => (
          <Section key={s.title} section={s} />
        ))}
      </div>
    }
    return (
      <div className={style['main-content-container']}>
        <Section section={section} />
      </div>
    )
  }

  render () {
    const { sections } = this.props
    const allOptionsTitle = Object.values(sections).reduce((acc, val) => {
      if (!val) {
        return acc
      }
      const fields = Array.isArray(val) ? val.reduce((a, v) => [...a, ...v.fields], []) : val.fields
      return fields.reduce((acc2, val2) => ([ ...acc2, val2.title ]), acc)
    }, [])
    return (
      <div className={style['settings-box']}>
        <Card className={`wizard-pf-sidebar ${style['navigation-content']}`}>
          <ul className='list-group'>
            {this.buildItems()}
          </ul>
        </Card>
        <div className={style['search-content-box']}>
          <TypeAheadSelect
            onChange={this.handleSearch}
            id='settings-search'
            options={allOptionsTitle}
            labelKey='options'
            placeholder='Search settings'
          />
          <Card className={style['main-content']}>
            {this.buildSection(sections[this.state.selectedSection])}
          </Card>
        </div>
      </div>
    )
  }
}
Settings.propTypes = {
  sections: PropTypes.object.isRequired,
}

export default Settings
