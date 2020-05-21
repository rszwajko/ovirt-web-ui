import React from 'react'
import { Checkbox } from 'patternfly-react'
import PropTypes from 'prop-types'
import { msg } from '_/intl'
import SelectBox from '../SelectBox'
import style from './style.css'

const ternaryLogicValues = [
  {
    id: 1,
    value: msg.yes(),
    realValue: true,
  },
  {
    id: 0,
    value: msg.no(),
    realValue: false,
  },
  {
    id: -1,
    value: msg.notAvailable(),
    realValue: undefined,
  },
]
export { ternaryLogicValues }

export function toId (value) {
  return value === undefined ? -1 : value ? 1 : 0
}

export function toValue (id) { return id === -1 ? undefined : !!id }

const OptionalCheckbox = ({ id, value, onChange, label, isMultiSelect }) => {
  const showCheckbox = value !== undefined && !isMultiSelect
  return (
    <React.Fragment>
      {showCheckbox &&
      <Checkbox
        id={id}
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      >
        {label}
      </Checkbox>
      }
      {!showCheckbox &&
      <div>
        {label}
        <div className={style['quarter-width']}>
          <SelectBox
            id={id}
            items={ternaryLogicValues}
            selected={toId(value)}
            onChange={(id) => onChange(toValue(id))}
          />
        </div>
      </div>
      }
    </React.Fragment>
  )
}

OptionalCheckbox.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  isMultiSelect: PropTypes.bool,
}

export default OptionalCheckbox
