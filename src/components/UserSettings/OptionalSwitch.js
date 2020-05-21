import React from 'react'
import PropTypes from 'prop-types'
import SelectBox from '../SelectBox'
import style from './style.css'
import { Switch } from 'patternfly-react'
import { ternaryLogicValues, toId, toValue } from './OptionalCheckbox'

const OptionalSwitch = ({ id, value, onChange, isMultiSelect }) => {
  const showSwitch = value !== undefined && !isMultiSelect
  return (
    <React.Fragment>
      {showSwitch &&
      <Switch
        id={id}
        bsSize='normal'
        title='normal'
        value={value}
        onChange={(e, state) => onChange(state)}
      />
      }
      {!showSwitch &&
        <div className={style['quarter-width']}>
          <SelectBox
            id={id}
            items={ternaryLogicValues}
            selected={toId(value)}
            onChange={(id) => onChange(toValue(id))}
          />
        </div>

      }
    </React.Fragment>
  )
}

OptionalSwitch.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  isMultiSelect: PropTypes.bool,
}

export default OptionalSwitch
