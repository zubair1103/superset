import { SelectOption } from "@superset-ui/chart-controls";
import { JsonResponse, SupersetClient } from "@superset-ui/core";
import { uniqBy } from "lodash";
import rison from "rison";
import { AsyncSelect } from "src/components";
import { FilterOperator } from "src/components/ListView";
import { AsyncSelectProps } from "src/components/Select/types";
import ControlHeader from "../ControlHeader";

function SelectDashboardControl(props: any) {

  const fetchDashboards = async (
    filterValue = '',
    page: number,
    pageSize: number,
  ) => {
    // add filters if filterValue
    const filters = filterValue
      ? {
        filters: [
          {
            col: 'dashboards',
            opr: FilterOperator.relationManyMany,
            value: filterValue,
          },
        ],
      }
      : {};
    const queryParams = rison.encode({
      columns: ['dashboard_title', 'id'],
      keys: ['none'],
      order_column: 'dashboard_title',
      order_direction: 'asc',
      page,
      page_size: pageSize,
      ...filters,
    });
    const response: void | JsonResponse = await SupersetClient.get({
      endpoint: `/api/v1/dashboard/?q=${queryParams}`,
    }).catch((e) => {
      console.error(e);
    });
    const dashboards = response?.json?.result?.map(
      ({
        dashboard_title: dashboardTitle,
        id,
      }: {
        dashboard_title: string;
        id: number;
      }) => ({
        label: dashboardTitle,
        value: id,
      }),
    );
    return {
      data: uniqBy<SelectOption>(dashboards, 'value'),
      totalCount: response?.json?.count,
    };
  };

  const onChange = (e: any) => {
    return props.onChange(e, []);
  }

  return (
    <AsyncSelect
      {...props}
      options={fetchDashboards}
      onChange={onChange}
      header={<ControlHeader {...props} />}
      allowClear
    />
  )
}

export default SelectDashboardControl;