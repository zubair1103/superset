import { t } from "@superset-ui/core";
import { ControlConfig, ControlPanelSectionConfig, ControlPanelsContainerProps, ControlStateMapping } from "..";
import { sharedControls } from "..";
import { useHistory } from "react-router-dom";
import { camelCase, isPlainObject } from "lodash";
import { RootState } from 'src/dashboard/types';
import { useSelector } from 'react-redux';

export enum DrillThroughMode {
  dashboard = 'dashboard',
  url = 'url',
};

export const DrillThroughModeLabel = {
  [DrillThroughMode.dashboard]: t('Dashboard'),
  [DrillThroughMode.url]: t('URL'),
};

function getDrillThroughMode(controls: ControlStateMapping): DrillThroughMode {
  const mode = controls?.drill_through_mode?.value;
  if (mode === DrillThroughMode.dashboard || mode === DrillThroughMode.url) {
    return mode as DrillThroughMode;
  }

  return DrillThroughMode.dashboard;
}

function isDrillThroughMode(mode: DrillThroughMode) {
  return ({ controls }: Pick<ControlPanelsContainerProps, 'controls'>) =>
    getDrillThroughMode(controls) === mode;
}

const isDashboardMode = isDrillThroughMode(DrillThroughMode.dashboard);
const isUrlMode = isDrillThroughMode(DrillThroughMode.url);

const validateURLControlValue = (
  controls: ControlStateMapping,
  value: string | any,
) => {
  if (value && isUrlMode({ controls })) {
    try {
      new URL(value);
    } catch (e) {
      return [t('Invalid url')]
    }
  }
  return [];
};

const drillThroughMode: ControlConfig<'RadioButtonControl'> = {
  type: 'RadioButtonControl',
  label: t('Drill through mode'),
  default: DrillThroughMode.dashboard,
  options: [
    [DrillThroughMode.dashboard, DrillThroughModeLabel[DrillThroughMode.dashboard]],
    [DrillThroughMode.url, DrillThroughModeLabel[DrillThroughMode.url]],
  ],
  rerender: ['drill_through_dashboard', 'drill_through_url'],
  renderTrigger: true,
};

const drillThrougDashboard: ControlConfig<'SelectDashboardControl'> = {
  type: 'SelectDashboardControl',
  label: t('Dashboard'),
  renderTrigger: true,
  visibility: isDashboardMode,
};

const drillThrougUrl: ControlConfig<'TextControl'> = {
  type: 'TextControl',
  label: t('URL'),
  renderTrigger: true,
  visibility: isUrlMode,
  mapStateToProps: ({ controls }, controlState) => {
    return {
      externalValidationErrors: validateURLControlValue(controls, controlState?.value)
    }
  }
};

export const drillThroughControls: ControlPanelSectionConfig = {
  label: t('Drill through options'),
  expanded: true,
  tabOverride: 'customize',
  controlSetRows: [
    [
      {
        name: 'drill_through_mode',
        config: drillThroughMode
      },
    ],
    [
      {
        name: 'drill_through_dashboard',
        config: drillThrougDashboard,
      }
    ],
    [
      {
        name: 'drill_through_url',
        config: drillThrougUrl,
      }
    ], [
      {
        name: 'drill_through_columns',
        config: {
          ...sharedControls.columns,
          label: t('Filters'),
          description: t('One or more columns to pass as filter'),
          renderTrigger: true,
        }
      }
    ]
  ]
};

export function useDrillThrough() {
  const history = useHistory();

  const { dataMask } = useSelector((state: RootState) => ({
    dataMask: state.dataMask,
  }));

  const extarctFilters = (formData: any, itemData: any) => {
    const columns = formData[camelCase("drill_through_columns")] as string[];
    const filters = {};
    if (columns?.length) {
      columns.forEach((col) => {
        if (isPlainObject(itemData) && col in itemData) {
          filters[col] = itemData[col]
        }
      })
    }

    return filters;
  }

  return {
    handleDrillThroughClick: (formData: any, { data }: { data: any, [key: string]: any }) => {
      const mode = formData[camelCase("drill_through_mode")] as DrillThroughMode;
      if (mode === DrillThroughMode.dashboard) {
        const dashboard = formData[camelCase("drill_through_dashboard")];
        if (dashboard) {
          const filters = extarctFilters(formData, data);
          const { value: id } = dashboard;
          sessionStorage.setItem("drill_through_dataMask", JSON.stringify(dataMask));
          sessionStorage.setItem("drill_through_col_filters", JSON.stringify(filters));
          history.push(`/superset/dashboard/${id}`);
        }
      } else if (mode === DrillThroughMode.url) {
        const url = formData[camelCase("drill_through_url")];
        if (url) {
          const filters = extarctFilters(formData, data);
          const _url = new URL(url);
          _url.searchParams.append('drill_through_col_filters', JSON.stringify(filters))
          window.open(_url.toString(), "_blank");
        }
      }
    }
  }
}